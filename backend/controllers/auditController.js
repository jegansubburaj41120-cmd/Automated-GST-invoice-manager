const { query } = require('../config/db');

/**
 * Get audit logs with pagination and filters (Admin only)
 */
async function getAuditLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 15;
    const offset = (page - 1) * limit;
    const moduleName = req.query.module || null;
    const action = req.query.action || null;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;

    let whereConditions = [];
    let params = [];

    if (moduleName) {
      whereConditions.push('module = ?');
      params.push(moduleName);
    }

    if (action) {
      whereConditions.push('action = ?');
      params.push(action);
    }

    if (search) {
      whereConditions.push('(user_name LIKE ? OR details LIKE ? OR record_id LIKE ?)');
      params.push(search, search, search);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM audit_logs ${whereClause}`, params);
    const total = countResult[0].total;

    const sql = `
      SELECT *
      FROM audit_logs
      ${whereClause}
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const logs = await query(sql, [...params, limit, offset]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAuditLogs
};
