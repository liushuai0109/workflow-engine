import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  disabled: boolean;
}

export interface ClaudeConfig {
  baseURL: string;
  apiKey: string;
}

export interface Config {
  port: number;
  corsOrigin: string;
  environment: string;
  database: DatabaseConfig;
  claude: ClaudeConfig;
}

function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

function getEnvAsInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvAsBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

export function loadConfig(): Config {
  return {
    port: getEnvAsInt('PORT', 3000),
    corsOrigin: getEnv(
      'CORS_ORIGIN',
      'http://editor.workflow.com,http://editor.workflow.com:8000,http://localhost:8000'
    ),
    environment: getEnv('NODE_ENV', 'development'),
    database: {
      host: getEnv('DB_HOST', 'localhost'),
      port: getEnvAsInt('DB_PORT', 5432),
      user: getEnv('DB_USER', 'postgres'),
      password: getEnv('DB_PASSWORD', ''),
      database: getEnv('DB_NAME', 'workflow_engine'),
      disabled: getEnvAsBool('DB_DISABLED', false),
    },
    claude: {
      baseURL: getEnv('CLAUDE_API_BASE_URL', 'https://api.jiekou.ai'),
      apiKey: getEnv('CLAUDE_API_KEY', ''),
    },
  };
}
