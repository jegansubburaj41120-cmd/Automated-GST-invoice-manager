const { query } = require('../config/db');

async function logAudit(user, action, moduleName, recordId = null, details = null, ip = '127.0.0.1') {
  try {
    const userId = user ? user.id : null;
    const userName = user ? user.name : 'System';
    const userRole = user ? user.role : 'system';
    const detailString = typeof details === 'object' ? JSON.stringify(details) : details;

    await query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, module, record_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, userName, userRole, action, moduleName, String(recordId || ''), detailString, ip]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
}

module.exports = {
  logAudit
};
