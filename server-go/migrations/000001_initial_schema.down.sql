-- 回滚初始schema迁移

DROP INDEX IF EXISTS idx_executions_variables;
DROP INDEX IF EXISTS idx_executions_status;
DROP INDEX IF EXISTS idx_executions_workflow;
DROP INDEX IF EXISTS idx_executions_instance;
DROP TABLE IF EXISTS workflow_executions;

DROP INDEX IF EXISTS idx_instances_status;
DROP INDEX IF EXISTS idx_instances_workflow;
DROP TABLE IF EXISTS workflow_instances;

DROP INDEX IF EXISTS idx_workflows_status;
DROP TABLE IF EXISTS workflows;

DROP INDEX IF EXISTS idx_users_created_at;
DROP INDEX IF EXISTS idx_users_attributes;
DROP TABLE IF EXISTS users;

