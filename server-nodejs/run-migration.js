#!/usr/bin/env node
/**
 * Simple migration runner script
 * Usage: node run-migration.js <path-to-migration.sql>
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration (adjust as needed)
const dbConfig = {
  user: process.env.DB_USER || 'lothar',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'workflow_engine',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
};

async function runMigration(sqlFilePath) {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    console.log(`  Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);

    await client.connect();
    console.log('✅ Connected successfully!\n');

    console.log(`Reading migration file: ${sqlFilePath}`);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`  File size: ${sql.length} bytes\n`);

    console.log('Running migration...');
    await client.query(sql);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-migration.js <path-to-migration.sql>');
  console.error('Example: node run-migration.js ../server-go/migrations/000004_add_marketing_plan_tables.up.sql');
  process.exit(1);
}

const fullPath = path.resolve(migrationFile);
if (!fs.existsSync(fullPath)) {
  console.error(`Migration file not found: ${fullPath}`);
  process.exit(1);
}

runMigration(fullPath);
