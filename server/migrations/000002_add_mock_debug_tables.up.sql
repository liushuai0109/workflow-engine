-- 添加 Mock 和 Debug 功能相关表

-- 表：debug_sessions
CREATE TABLE IF NOT EXISTS debug_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  execution_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  current_node_id VARCHAR(255),
  variables JSONB DEFAULT '{}',
  breakpoints VARCHAR(255)[] DEFAULT '{}',
  call_stack JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_debug_status CHECK (
    status IN ('pending', 'running', 'paused', 'completed', 'stopped')
  )
);

CREATE INDEX IF NOT EXISTS idx_debug_sessions_workflow_id ON debug_sessions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_execution_id ON debug_sessions(execution_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_status ON debug_sessions(status);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_variables ON debug_sessions USING GIN (variables);

-- 表：execution_histories
CREATE TABLE IF NOT EXISTS execution_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL,
  node_id VARCHAR(255) NOT NULL,
  node_name VARCHAR(255),
  node_type INTEGER NOT NULL,
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  variables_before JSONB DEFAULT '{}',
  variables_after JSONB DEFAULT '{}',
  execution_time_ms INTEGER,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_histories_execution_id ON execution_histories(execution_id);
CREATE INDEX IF NOT EXISTS idx_execution_histories_node_id ON execution_histories(node_id);
CREATE INDEX IF NOT EXISTS idx_execution_histories_executed_at ON execution_histories(executed_at);

