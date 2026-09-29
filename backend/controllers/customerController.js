const { query } = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');

/**
 * Get all customers with search, filter, pagination
 */
async function getCustomers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const customerType = req.query.type || null;
    const state = req.query.state || null;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR phone LIKE ? OR email LIKE ? OR gstin LIKE ? OR city LIKE ?)');
      params.push(search, search, search, search, search);
    }

    if (customerType) {
      whereConditions.push('customer_type = ?');
      params.push(customerType);
    }

    if (state) {
      whereConditions.push('state = ?');
      params.push(state);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Count total records
    const countResult = await query(`SELECT COUNT(*) as total FROM customers ${whereClause}`, params);
    const total = countResult[0].total;

    // Fetch records
    const sql = `
      SELECT c.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM invoices WHERE customer_id = c.id) as total_invoices,
        (SELECT COALESCE(SUM(grand_total), 0) FROM invoices WHERE customer_id = c.id) as total_billed,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices WHERE customer_id = c.id) as total_paid,
        (SELECT COALESCE(SUM(balance_amount), 0) FROM invoices WHERE customer_id = c.id) as total_outstanding
      FROM customers c
      LEFT JOIN users u ON c.created_by = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const customers = await query(sql, [...params, limit, offset]);

    res.json({
      success: true,
      data: customers,
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
 * Get all active customers for dropdowns / autocompletes
 */
async function getAllCustomersSimple(req, res, next) {
  try {
    const customers = await query(
      'SELECT id, name, phone, email, gstin, pan, customer_type, billing_address, state, state_code, city, pincode FROM customers ORDER BY name ASC'
    );
    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get customer by ID with invoice and payment history
 */
async function getCustomerById(req, res, next) {
  try {
    const customerId = req.params.id;
    const customers = await query('SELECT * FROM customers WHERE id = ?', [customerId]);

    if (!customers || customers.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const customer = customers[0];

    // Get customer invoices
    const invoices = await query(
      'SELECT id, invoice_number, invoice_date, due_date, grand_total, paid_amount, balance_amount, status, pdf_path FROM invoices WHERE customer_id = ? ORDER BY invoice_date DESC',
      [customerId]
    );

    // Get customer payments and receipts
    const payments = await query(
      `SELECT p.*, r.receipt_number, r.pdf_path as receipt_pdf, i.invoice_number 
       FROM payments p
       LEFT JOIN receipts r ON r.payment_id = p.id
       LEFT JOIN invoices i ON i.id = p.invoice_id
       WHERE p.customer_id = ?
       ORDER BY p.payment_date DESC`,
      [customerId]
    );

    // Stats
    const stats = {
      totalInvoices: invoices.length,
      totalBilled: invoices.reduce((acc, inv) => acc + Number(inv.grand_total), 0),
      totalPaid: invoices.reduce((acc, inv) => acc + Number(inv.paid_amount), 0),
      outstandingBalance: invoices.reduce((acc, inv) => acc + Number(inv.balance_amount), 0)
    };

    res.json({
      success: true,
      data: {
        customer,
        invoices,
        payments,
        stats
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create customer
 */
async function createCustomer(req, res, next) {
  try {
    const {
      name, email, phone, gstin, pan, customer_type,
      billing_address, shipping_address, city, state, state_code, pincode
    } = req.body;

    const formattedGstin = gstin ? gstin.trim().toUpperCase() : null;
    let derivedPan = pan ? pan.trim().toUpperCase() : null;

    // Auto extract PAN from GSTIN if 15 digit GSTIN provided (characters 3-12 are PAN)
    if (formattedGstin && formattedGstin.length === 15 && !derivedPan) {
      derivedPan = formattedGstin.substring(2, 12);
    }

    const result = await query(
      `INSERT INTO customers 
       (name, email, phone, gstin, pan, customer_type, billing_address, shipping_address, city, state, state_code, pincode, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        email ? email.trim() : null,
        phone.trim(),
        formattedGstin,
        derivedPan,
        customer_type || (formattedGstin ? 'registered' : 'unregistered'),
        billing_address.trim(),
        shipping_address ? shipping_address.trim() : billing_address.trim(),
        city ? city.trim() : null,
        state.trim(),
        state_code.trim().padStart(2, '0'),
        pincode ? pincode.trim() : null,
        req.user.id
      ]
    );

    await logAudit(req.user, 'CREATE_CUSTOMER', 'CUSTOMERS', result.insertId, `Created customer: ${name}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Customer added successfully.',
      customerId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update customer
 */
async function updateCustomer(req, res, next) {
  try {
    const customerId = req.params.id;
    const {
      name, email, phone, gstin, pan, customer_type,
      billing_address, shipping_address, city, state, state_code, pincode
    } = req.body;

    const formattedGstin = gstin ? gstin.trim().toUpperCase() : null;
    let derivedPan = pan ? pan.trim().toUpperCase() : null;
    if (formattedGstin && formattedGstin.length === 15 && !derivedPan) {
      derivedPan = formattedGstin.substring(2, 12);
    }

    await query(
      `UPDATE customers SET
        name = ?, email = ?, phone = ?, gstin = ?, pan = ?, customer_type = ?,
        billing_address = ?, shipping_address = ?, city = ?, state = ?, state_code = ?, pincode = ?
       WHERE id = ?`,
      [
        name.trim(),
        email ? email.trim() : null,
        phone.trim(),
        formattedGstin,
        derivedPan,
        customer_type || (formattedGstin ? 'registered' : 'unregistered'),
        billing_address.trim(),
        shipping_address ? shipping_address.trim() : billing_address.trim(),
        city ? city.trim() : null,
        state.trim(),
        state_code.trim().padStart(2, '0'),
        pincode ? pincode.trim() : null,
        customerId
      ]
    );

    await logAudit(req.user, 'UPDATE_CUSTOMER', 'CUSTOMERS', customerId, `Updated customer: ${name}`, req.ip);

    res.json({
      success: true,
      message: 'Customer updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete customer
 */
async function deleteCustomer(req, res, next) {
  try {
    const customerId = req.params.id;

    // Check if customer has invoices
    const invoices = await query('SELECT id FROM invoices WHERE customer_id = ? LIMIT 1', [customerId]);
    if (invoices && invoices.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete customer because existing invoices and receipts are linked to them.'
      });
    }

    await query('DELETE FROM customers WHERE id = ?', [customerId]);
    await logAudit(req.user, 'DELETE_CUSTOMER', 'CUSTOMERS', customerId, `Deleted customer ID: ${customerId}`, req.ip);

    res.json({
      success: true,
      message: 'Customer deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCustomers,
  getAllCustomersSimple,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
