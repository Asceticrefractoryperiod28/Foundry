/**
 * 数据库连接诊断脚本
 * 用法: node scripts/diagnose-db.js
 */
const { Client } = require('pg');
const net = require('net');

async function diagnose() {
  console.log('=== 数据库连接诊断 ===\n');

  // 1. 检查 TCP 端口
  console.log('1. 检查 TCP 5432 端口...');
  await new Promise((resolve) => {
    const s = net.createConnection({ host: 'localhost', port: 5432 }, () => {
      console.log('   ✅ TCP 5432 端口开放');
      s.end();
      resolve();
    });
    s.on('error', (e) => {
      console.log('   ❌ TCP 5432 端口不可达:', e.message);
      resolve();
    });
    s.setTimeout(3000, () => {
      console.log('   ❌ TCP 5432 连接超时');
      s.destroy();
      resolve();
    });
  });

  // 2. 用 pg 驱动连接 service_db
  console.log('\n2. 连接 service_db (postgres/postgres@localhost:5432)...');
  const client1 = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'service_db',
    connectionTimeoutMillis: 5000,
  });
  try {
    await client1.connect();
    const r = await client1.query('SELECT version()');
    console.log('   ✅ 连接成功');
    console.log('   PostgreSQL 版本:', r.rows[0].version);
    await client1.end();
  } catch (e) {
    console.log('   ❌ 连接失败:', e.message);
    try { await client1.end(); } catch {}
  }

  // 3. 用 pg 驱动连接 gateway_db
  console.log('\n3. 连接 gateway_db (postgres/postgres@localhost:5432)...');
  const client2 = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'gateway_db',
    connectionTimeoutMillis: 5000,
  });
  try {
    await client2.connect();
    console.log('   ✅ 连接成功');
    await client2.end();
  } catch (e) {
    console.log('   ❌ 连接失败:', e.message);
    try { await client2.end(); } catch {}
  }

  // 4. 检查环境变量
  console.log('\n4. 检查 process.env 中的数据库变量:');
  console.log('   DB_HOST:', process.env.DB_HOST || '(未设置)');
  console.log('   DB_PORT:', process.env.DB_PORT || '(未设置)');
  console.log('   DB_USERNAME:', process.env.DB_USERNAME || '(未设置)');
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : '(未设置)');
  console.log('   DB_DATABASE:', process.env.DB_DATABASE || '(未设置)');

  // 5. 检查 Docker 容器状态
  console.log('\n5. 检查 Docker 容器状态:');
  const { execSync } = require('child_process');
  try {
    const ps = execSync('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', { encoding: 'utf8' });
    console.log(ps);
  } catch (e) {
    console.log('   ❌ 无法执行 docker ps:', e.message);
  }

  // 6. 检查容器内 PostgreSQL 状态
  console.log('\n6. 检查容器内 PostgreSQL 状态:');
  try {
    const ready = execSync('docker exec service-postgres-dev pg_isready -U postgres', { encoding: 'utf8' });
    console.log('   ', ready.trim());
  } catch (e) {
    console.log('   ❌ pg_isready 失败:', e.message);
  }

  // 7. 检查容器内 psql 连接
  console.log('\n7. 检查容器内 psql 连接:');
  try {
    const psql = execSync('docker exec service-postgres-dev psql -U postgres -c "SELECT 1;"', { encoding: 'utf8' });
    console.log('   ✅ 容器内 psql 正常:', psql.trim());
  } catch (e) {
    console.log('   ❌ 容器内 psql 失败:', e.message);
  }

  // 8. 检查 pg_hba.conf
  console.log('\n8. 检查容器内 pg_hba.conf:');
  try {
    const hba = execSync('docker exec service-postgres-dev cat /etc/postgresql/pg_hba.conf', { encoding: 'utf8' });
    console.log(hba);
  } catch (e) {
    console.log('   ❌ 无法读取 pg_hba.conf:', e.message);
  }

  console.log('\n=== 诊断完成 ===');
}

diagnose().catch(console.error);
