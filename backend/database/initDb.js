const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('../config/config');

async function initializeDatabase() {
  console.log('Connecting to MySQL server...');
  
  // Connect without database selected first to create database if not exists
  const connection = await mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    port: config.db.port,
    multipleStatements: true
  });

  try {
    console.log(`Ensuring database '${config.db.database}' exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.db.database}\`;`);
    await connection.query(`USE \`${config.db.database}\`;`);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying database schema...');
    await connection.query(schemaSql);

    // Create upload and public directories if not exist
    const dirs = [
      path.join(__dirname, '../public/invoices'),
      path.join(__dirname, '../public/receipts'),
      path.join(__dirname, '../public/qrcodes'),
      path.join(__dirname, '../uploads')
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        // Create a gitkeep
        fs.writeFileSync(path.join(dir, '.gitkeep'), '');
      }
    });

    console.log('✅ Database schema initialized successfully and folders created!');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  initializeDatabase().then(() => process.exit(0));
}

module.exports = initializeDatabase;
