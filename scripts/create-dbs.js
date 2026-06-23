/**
 * 创建 Gateway 数据库
 * 用法: node scripts/create-dbs.js
 */
const { Client } = require('pg');

async function createDatabases() {
  // 连接到默认 postgres 数据库来创建新数据库
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'postgres',
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();

    // 检查 gateway_db 是否存在
    const check = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'gateway_db'"
    );

    if (check.rows.length === 0) {
      await client.query('CREATE DATABASE gateway_db');
      console.log('✅ Created gateway_db');
    } else {
      console.log('ℹ️  gateway_db already exists');
    }
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('ℹ️  gateway_db already exists');
    } else {
      console.error('❌ Failed to create gateway_db:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

createDatabases();
