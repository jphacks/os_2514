const { Pool } = require('pg');
const ENV = require('../config/environment');

const pool = new Pool({
  host: ENV.PG_HOST,
  port: ENV.PG_PORT,
  database: ENV.PG_DATABASE,
  user: ENV.PG_USER,
  password: ENV.PG_PASSWORD,
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err);
});

module.exports = pool;