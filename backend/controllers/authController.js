const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { query } = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');

/**
 * Login user (Admin or Staff)
 */
async function login(req, res, next) {
  try {
    const { email, password, portal_role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const users = await query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (!users || users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact your system administrator.'
      });
    }

    // Role check if logging in via dedicated Admin or Staff portal
    if (portal_role === 'admin' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: This login is reserved for Administrators only. Please use the Staff / User Login portal.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = ?', [user.id]);

    // Sign JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const userObj = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      status: user.status
    };

    await logAudit(userObj, 'USER_LOGIN', 'AUTH', user.id, `User logged in: ${user.email}`, req.ip);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: userObj
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Register staff / user (Admin protected or seed)
 */
async function register(req, res, next) {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required.'
      });
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const assignedRole = role === 'admin' ? 'admin' : 'staff';

    const result = await query(
      `INSERT INTO users (name, email, password, role, phone, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
      [name.trim(), email.trim().toLowerCase(), hashedPassword, assignedRole, phone || null]
    );

    await logAudit(req.user, 'CREATE_USER', 'USERS', result.insertId, `Created user: ${email} (${assignedRole})`, req.ip);

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
 * Get current user profile
 */
async function getProfile(req, res, next) {
  try {
    const users = await query('SELECT id, name, email, role, phone, status, last_login, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Profile
 */
async function updateProfile(req, res, next) {
  try {
    const { name, phone, password } = req.body;
    let sql = 'UPDATE users SET name = ?, phone = ?';
    const params = [name.trim(), phone ? phone.trim() : null];

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password.trim(), salt);
      sql += ', password = ?';
      params.push(hashedPassword);
    }

    sql += ' WHERE id = ?';
    params.push(req.user.id);

    await query(sql, params);
    await logAudit(req.user, 'UPDATE_PROFILE', 'AUTH', req.user.id, 'User updated their profile details', req.ip);

    res.json({
      success: true,
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  register,
  getProfile,
  updateProfile
};
