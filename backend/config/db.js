const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool(config.db);

// Helper for executing queries with automatic error logs
async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (err) {
    console.error('Database query error:', err.message, 'SQL:', sql);
    throw err;
  }
}

// Helper to get connection from pool for transactions
async function getConnection() {
  return await pool.getConnection();
}

module.exports = {
  pool,
  query,
  getConnection
};
