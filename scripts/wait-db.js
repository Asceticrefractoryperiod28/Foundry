/**
 * 等待 PostgreSQL 就绪（真正执行 SQL 连接检测）
 * 用法: node scripts/wait-db.js
 */
const { Client } = require('pg');

const MAX_ATTEMPTS = 30;
const RETRY_DELAY = 3000;

let attempts = 0;

function tryConnect() {
  attempts++;
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'service_db',
    connectionTimeoutMillis: 5000,
  });

  client
    .connect()
    .then(() => client.query('SELECT 1'))
    .then(() => {
      console.log('✅ PostgreSQL is ready and accepting connections');
      client.end();
      process.exit(0);
    })
    .catch((err) => {
      try {
        client.end();
      } catch {}
      if (attempts >= MAX_ATTEMPTS) {
        console.error('❌ PostgreSQL not ready after ' + MAX_ATTEMPTS + ' attempts');
        console.error('   Last error:', err.message);
        process.exit(1);
      }
      console.log(
        '⏳ Waiting for PostgreSQL... (' + attempts + '/' + MAX_ATTEMPTS + ') ' + err.message
      );
      setTimeout(tryConnect, RETRY_DELAY);
    });
}

tryConnect();
