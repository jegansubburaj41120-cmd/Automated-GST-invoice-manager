const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');

/**
 * Get all users (Admin only)
 */
async function getUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const role = req.query.role || null;
    const status = req.query.status || null;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      params.push(search, search, search);
    }

    if (role) {
      whereConditions.push('role = ?');
      params.push(role);
    }

    if (status) {
      whereConditions.push('status = ?');
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = countResult[0].total;

    const sql = `
      SELECT id, name, email, role, phone, status, last_login, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY id ASC
      LIMIT ? OFFSET ?
    `;

    const users = await query(sql, [...params, limit, offset]);

    res.json({
      success: true,
      data: users,
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

/**
 * Create user (Admin only)
 */
async function createUser(req, res, next) {
  try {
    const { name, email, password, role, phone, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    const result = await query(
      `INSERT INTO users (name, email, password, role, phone, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        hashedPassword,
        role === 'admin' ? 'admin' : 'staff',
        phone ? phone.trim() : null,
        status || 'active'
      ]
    );

    await logAudit(req.user, 'CREATE_USER', 'USERS', result.insertId, `Admin created user: ${email} (${role})`, req.ip);

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      userId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user (Admin only)
 */
async function updateUser(req, res, next) {
  try {
    const userId = req.params.id;
    const { name, email, password, role, phone, status } = req.body;

    let sql = 'UPDATE users SET name = ?, email = ?, role = ?, phone = ?, status = ?';
    let params = [
      name.trim(),
      email.trim().toLowerCase(),
      role === 'admin' ? 'admin' : 'staff',
      phone ? phone.trim() : null,
      status || 'active'
    ];

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password.trim(), salt);
      sql += ', password = ?';
      params.push(hashedPassword);
    }

    sql += ' WHERE id = ?';
    params.push(userId);

    await query(sql, params);
    await logAudit(req.user, 'UPDATE_USER', 'USERS', userId, `Updated user ID: ${userId} (${email})`, req.ip);

    res.json({
      success: true,
      message: 'User updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete user (Admin only)
 */
async function deleteUser(req, res, next) {
  try {
    const userId = req.params.id;

    if (parseInt(userId, 10) === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active administrator account.' });
    }

    await query('DELETE FROM users WHERE id = ?', [userId]);
    await logAudit(req.user, 'DELETE_USER', 'USERS', userId, `Deleted user ID: ${userId}`, req.ip);

    res.json({
      success: true,
      message: 'User deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
