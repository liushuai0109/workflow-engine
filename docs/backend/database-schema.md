# Database Schema

## Overview

This document describes the database schema for the lifecycle operations management platform.

## Database: PostgreSQL 14+

### Table: users

User profile and lifecycle information.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  current_lifecycle_stage VARCHAR(50) NOT NULL,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_lifecycle_stage CHECK (
    current_lifecycle_stage IN ('Acquisition', 'Activation', 'Retention', 'Revenue', 'Referral')
  )
);

CREATE INDEX idx_users_lifecycle_stage ON users(current_lifecycle_stage);
CREATE INDEX idx_users_attributes ON users USING GIN (attributes);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Table: user_lifecycle_history

Historical record of lifecycle stage transitions.

```sql
CREATE TABLE user_lifecycle_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  from_stage VARCHAR(50),
  to_stage VARCHAR(50) NOT NULL,
  transitioned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workflow_execution_id UUID,
  metadata JSONB DEFAULT '{}',

  CONSTRAINT valid_stages CHECK (
    (from_stage IS NULL OR from_stage IN ('Acquisition', 'Activation', 'Retention', 'Revenue', 'Referral'))
    AND to_stage IN ('Acquisition', 'Activation', 'Retention', 'Revenue', 'Referral')
  )
);

CREATE INDEX idx_lifecycle_history_user ON user_lifecycle_history(user_id, transitioned_at DESC);
CREATE INDEX idx_lifecycle_history_stage ON user_lifecycle_history(to_stage, transitioned_at DESC);
```

### Table: workflows

BPMN workflow definitions.

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  bpmn_xml TEXT NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  lifecycle_stages VARCHAR(50)[] DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_workflow_status CHECK (
    status IN ('draft', 'active', 'inactive', 'archived')
  )
);

CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_lifecycle ON workflows USING GIN (lifecycle_stages);
```

### Table: workflow_executions

Workflow execution instances.

```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  variables JSONB DEFAULT '{}',
  current_node_id VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  CONSTRAINT valid_execution_status CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  )
);

CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id, started_at DESC);
CREATE INDEX idx_executions_user ON workflow_executions(user_id, started_at DESC);
CREATE INDEX idx_executions_status ON workflow_executions(status, started_at DESC);
```

### Table: user_segments

User segment definitions.

```sql
CREATE TABLE user_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  conditions JSONB NOT NULL,
  lifecycle_stages VARCHAR(50)[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_segments_stages ON user_segments USING GIN (lifecycle_stages);
```

### Table: user_segment_memberships

User membership in segments (cached for performance).

```sql
CREATE TABLE user_segment_memberships (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES user_segments(id) ON DELETE CASCADE,
  evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,

  PRIMARY KEY (user_id, segment_id)
);

CREATE INDEX idx_memberships_segment ON user_segment_memberships(segment_id, evaluated_at DESC);
CREATE INDEX idx_memberships_expiry ON user_segment_memberships(valid_until) WHERE valid_until IS NOT NULL;
```

### Table: triggers

Event trigger definitions.

```sql
CREATE TABLE triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  conditions JSONB NOT NULL,
  workflow_id UUID REFERENCES workflows(id),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_triggers_event_type ON triggers(event_type) WHERE enabled = true;
CREATE INDEX idx_triggers_workflow ON triggers(workflow_id) WHERE enabled = true;
```

### Table: trigger_executions

Log of trigger firings.

```sql
CREATE TABLE trigger_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID NOT NULL REFERENCES triggers(id),
  user_id UUID REFERENCES users(id),
  event_data JSONB,
  condition_met BOOLEAN NOT NULL,
  workflow_execution_id UUID REFERENCES workflow_executions(id),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trigger_executions_trigger ON trigger_executions(trigger_id, executed_at DESC);
CREATE INDEX idx_trigger_executions_user ON trigger_executions(user_id, executed_at DESC);
```

### Table: lifecycle_events

Audit log of all lifecycle-related events.

```sql
CREATE TABLE lifecycle_events (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id),
  workflow_execution_id UUID REFERENCES workflow_executions(id),
  lifecycle_stage VARCHAR(50),
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_events_user ON lifecycle_events(user_id, created_at DESC);
CREATE INDEX idx_lifecycle_events_type ON lifecycle_events(event_type, created_at DESC);
CREATE INDEX idx_lifecycle_events_stage ON lifecycle_events(lifecycle_stage, created_at DESC);
CREATE INDEX idx_lifecycle_events_created ON lifecycle_events(created_at DESC);
```

### Table: metrics_daily

Aggregated daily metrics for reporting.

```sql
CREATE TABLE metrics_daily (
  id BIGSERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  lifecycle_stage VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value NUMERIC NOT NULL,
  dimensions JSONB DEFAULT '{}',

  UNIQUE (metric_date, lifecycle_stage, metric_name, dimensions)
);

CREATE INDEX idx_metrics_date_stage ON metrics_daily(metric_date DESC, lifecycle_stage);
CREATE INDEX idx_metrics_name ON metrics_daily(metric_name, metric_date DESC);
```

## Data Retention Policies

- **lifecycle_events**: Retain for 2 years, then archive to cold storage
- **trigger_executions**: Retain for 90 days
- **workflow_executions**: Retain for 1 year
- **user_lifecycle_history**: Retain indefinitely
- **metrics_daily**: Retain for 3 years

## Backup Strategy

- Full backup: Daily at 2:00 AM UTC
- Incremental backup: Every 6 hours
- Point-in-time recovery: 30 days
- Backup retention: 90 days

## Partitioning

Large tables are partitioned for performance:

- **lifecycle_events**: Partitioned by month (created_at)
- **trigger_executions**: Partitioned by month (executed_at)
- **metrics_daily**: Partitioned by year (metric_date)

## Example Partition Creation

```sql
-- Partition lifecycle_events by month
CREATE TABLE lifecycle_events_2024_01 PARTITION OF lifecycle_events
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE lifecycle_events_2024_02 PARTITION OF lifecycle_events
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```
