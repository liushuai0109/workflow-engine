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
    await client.connect();
    console.log('Connected successfully!');

    console.log(`Reading migration file: ${sqlFilePath}`);
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node run-migration.js <path-to-migration.sql>');
  process.exit(1);
}

if (!fs.existsSync(migrationFile)) {
  console.error(`Migration file not found: ${migrationFile}`);
  process.exit(1);
}

runMigration(migrationFile);
