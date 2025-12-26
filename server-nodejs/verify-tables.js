const { Client } = require('pg');

async function verifyTables() {
  const client = new Client({
    user: 'lothar',
    host: 'localhost',
    database: 'workflow_engine',
    port: 5432,
  });

  try {
    await client.connect();

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE 'marketing%'
          OR table_name LIKE 'audience%'
          OR table_name LIKE 'flow_chart%')
      ORDER BY table_name
    `);

    console.log('\n✅ Marketing Agent Tables Created:');
    console.log('=====================================');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    console.log('=====================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyTables();
