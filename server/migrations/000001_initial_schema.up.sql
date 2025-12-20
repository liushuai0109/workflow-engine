-- 初始数据库schema迁移
-- 基于 docs/backend/database-schema.md

-- 表：users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_attributes ON users USING GIN (attributes);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- 表：workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  bpmn_xml TEXT NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0.0',
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_workflow_status CHECK (
    status IN ('draft', 'active', 'inactive', 'archived')
  )
);

CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);

-- 表：workflow_instances
CREATE TABLE IF NOT EXISTS workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  current_node_ids VARCHAR(255)[] DEFAULT '{}',
  instance_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_instance_status CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_instances_workflow ON workflow_instances(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instances_status ON workflow_instances(status, created_at DESC);

-- 表：workflow_executions
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID NOT NULL REFERENCES workflow_instances(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  variables JSONB DEFAULT '{}',
  execution_version INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  CONSTRAINT valid_execution_status CHECK (
    status IN ('pending', 'running', 'completed', 'failed', 'cancelled')
  )
);

CREATE INDEX IF NOT EXISTS idx_executions_instance ON workflow_executions(instance_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_workflow ON workflow_executions(workflow_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_variables ON workflow_executions USING GIN (variables);

