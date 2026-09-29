const { query } = require('../config/db');
const { generateReceiptPdf } = require('../services/receiptPdfService');
const { generateReceiptQRCode } = require('../services/qrCodeService');
const { logAudit } = require('../middleware/auditLogger');

/**
 * Get all receipts with filters, search, pagination
 */
async function getReceipts(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const paymentMethod = req.query.payment_method || null;
    const fromDate = req.query.from_date || null;
    const toDate = req.query.to_date || null;
    const customerId = req.query.customer_id || null;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push('(r.receipt_number LIKE ? OR i.invoice_number LIKE ? OR c.name LIKE ? OR p.transaction_reference LIKE ?)');
      params.push(search, search, search, search);
    }

    if (paymentMethod) {
      whereConditions.push('p.payment_method = ?');
      params.push(paymentMethod);
    }

    if (customerId) {
      whereConditions.push('r.customer_id = ?');
      params.push(customerId);
    }

    if (fromDate) {
      whereConditions.push('r.receipt_date >= ?');
      params.push(fromDate);
    }

    if (toDate) {
      whereConditions.push('r.receipt_date <= ?');
      params.push(toDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM receipts r 
       JOIN invoices i ON r.invoice_id = i.id 
       JOIN customers c ON r.customer_id = c.id
       LEFT JOIN payments p ON r.payment_id = p.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const sql = `
      SELECT 
        r.*,
        i.invoice_number,
        i.grand_total as invoice_grand_total,
        i.paid_amount as invoice_paid_amount,
        i.balance_amount as invoice_balance_amount,
        i.status as invoice_status,
        c.name as customer_name,
        c.phone as customer_phone,
        c.gstin as customer_gstin,
        p.payment_method,
        p.transaction_reference,
        p.notes as payment_notes,
        u.name as created_by_name
      FROM receipts r
      JOIN invoices i ON r.invoice_id = i.id
      JOIN customers c ON r.customer_id = c.id
      LEFT JOIN payments p ON r.payment_id = p.id
      LEFT JOIN users u ON r.created_by = u.id
      ${whereClause}
      ORDER BY r.id DESC
      LIMIT ? OFFSET ?
    `;

    const receipts = await query(sql, [...params, limit, offset]);

    res.json({
      success: true,
      data: receipts,
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
 * Get receipt by ID
 */
async function getReceiptById(req, res, next) {
  try {
    const receiptId = req.params.id;

    const receipts = await query(
      `SELECT 
        r.*,
        i.invoice_number,
        i.invoice_date,
        i.grand_total as invoice_grand_total,
        i.paid_amount as invoice_paid_amount,
        i.balance_amount as invoice_balance_amount,
        i.status as invoice_status,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.billing_address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.state_code as customer_state_code,
        c.pincode as customer_pincode,
        c.gstin as customer_gstin,
        c.pan as customer_pan,
        p.payment_method,
        p.transaction_reference,
        p.notes as payment_notes,
        u.name as created_by_name
      FROM receipts r
      JOIN invoices i ON r.invoice_id = i.id
      JOIN customers c ON r.customer_id = c.id
      LEFT JOIN payments p ON r.payment_id = p.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.id = ?`,
      [receiptId]
    );

    if (!receipts || receipts.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const receipt = receipts[0];
    const settings = (await query('SELECT * FROM settings WHERE id = 1'))[0] || {};

    res.json({
      success: true,
      data: {
        receipt,
        settings
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Regenerate Receipt PDF
 */
async function regenerateReceiptPdf(req, res, next) {
  try {
    const receiptId = req.params.id;
    const receipts = await query('SELECT * FROM receipts WHERE id = ?', [receiptId]);
    if (!receipts || receipts.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    const receipt = receipts[0];
    const invoice = (await query('SELECT * FROM invoices WHERE id = ?', [receipt.invoice_id]))[0];
    const customer = (await query('SELECT * FROM customers WHERE id = ?', [receipt.customer_id]))[0];
    const payment = (await query('SELECT * FROM payments WHERE id = ?', [receipt.payment_id]))[0];
    const settings = (await query('SELECT * FROM settings WHERE id = 1'))[0] || {};

    const qrResult = await generateReceiptQRCode(receipt, settings);
    const pdfResult = await generateReceiptPdf(receipt, invoice, customer, payment, settings, qrResult ? qrResult.dataUrl : null);

    await query('UPDATE receipts SET pdf_path = ?, qr_path = ? WHERE id = ?', [pdfResult.relativeUrl, qrResult ? qrResult.relativeUrl : null, receiptId]);

    res.json({
      success: true,
      message: 'Receipt PDF regenerated successfully.',
      pdfUrl: pdfResult.relativeUrl
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getReceipts,
  getReceiptById,
  regenerateReceiptPdf
};
