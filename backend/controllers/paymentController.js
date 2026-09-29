const { query, getConnection } = require('../config/db');
const { formatDocumentNumber, getFinancialYear } = require('../utils/financialYear');
const { generateReceiptQRCode } = require('../services/qrCodeService');
const { generateReceiptPdf } = require('../services/receiptPdfService');
const { generateInvoicePdf } = require('../services/invoicePdfService');
const { generateInvoiceQRCode } = require('../services/qrCodeService');
const { logAudit } = require('../middleware/auditLogger');

/**
 * Generate next sequential receipt number safely
 */
async function getNextReceiptNumber(connection, prefix = 'REC') {
  const currentFy = getFinancialYear();
  const pattern = `${prefix}/${currentFy}/%`;

  const [rows] = await connection.execute(
    'SELECT receipt_number FROM receipts WHERE receipt_number LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE',
    [pattern]
  );

  let nextSeq = 1;
  if (rows && rows.length > 0) {
    const parts = rows[0].receipt_number.split('/');
    if (parts.length === 3) {
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum)) {
        nextSeq = lastNum + 1;
      }
    }
  }

  return formatDocumentNumber(prefix, nextSeq);
}

/**
 * Get payments list with filters
 */
async function getPayments(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const invoiceId = req.query.invoice_id || null;
    const customerId = req.query.customer_id || null;
    const paymentMethod = req.query.payment_method || null;
    const fromDate = req.query.from_date || null;
    const toDate = req.query.to_date || null;

    let whereConditions = [];
    let params = [];

    if (invoiceId) {
      whereConditions.push('p.invoice_id = ?');
      params.push(invoiceId);
    }

    if (customerId) {
      whereConditions.push('p.customer_id = ?');
      params.push(customerId);
    }

    if (paymentMethod) {
      whereConditions.push('p.payment_method = ?');
      params.push(paymentMethod);
    }

    if (fromDate) {
      whereConditions.push('p.payment_date >= ?');
      params.push(fromDate);
    }

    if (toDate) {
      whereConditions.push('p.payment_date <= ?');
      params.push(toDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM payments p ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const sql = `
      SELECT 
        p.*,
        i.invoice_number,
        i.grand_total as invoice_grand_total,
        i.balance_amount as invoice_balance_amount,
        c.name as customer_name,
        c.phone as customer_phone,
        r.id as receipt_id,
        r.receipt_number,
        r.pdf_path as receipt_pdf,
        u.name as recorded_by_name
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN receipts r ON r.payment_id = p.id
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `;

    const payments = await query(sql, [...params, limit, offset]);

    res.json({
      success: true,
      data: payments,
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
 * Record Payment and Automatically Generate Receipt & PDF (Complete Transactional Workflow)
 */
async function recordPayment(req, res, next) {
  const connection = await getConnection();

  try {
    const {
      invoice_id,
      amount,
      payment_method,
      payment_date,
      transaction_reference,
      notes
    } = req.body;

    const paymentAmount = Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than zero.'
      });
    }

    await connection.beginTransaction();

    // 1. Fetch and lock invoice row
    const [invoices] = await connection.execute(
      'SELECT * FROM invoices WHERE id = ? FOR UPDATE',
      [invoice_id]
    );

    if (!invoices || invoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = invoices[0];

    if (invoice.status === 'PAID') {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'This invoice has already been paid in full.'
      });
    }

    const currentBalance = Number(invoice.balance_amount);

    if (paymentAmount > currentBalance + 0.01) { // small tolerance for floating precision
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount.toFixed(2)}) cannot exceed outstanding balance (₹${currentBalance.toFixed(2)}).`
      });
    }

    // 2. Fetch Customer and Settings
    const [customers] = await connection.execute('SELECT * FROM customers WHERE id = ?', [invoice.customer_id]);
    const customer = customers[0];

    const [settingsList] = await connection.execute('SELECT * FROM settings WHERE id = 1');
    const settings = settingsList[0] || { receipt_prefix: 'REC' };

    // 3. Insert Payment Record
    const payDate = payment_date || new Date().toISOString().split('T')[0];
    const [paymentResult] = await connection.execute(
      `INSERT INTO payments (
        invoice_id, customer_id, payment_date, amount, payment_method,
        transaction_reference, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice.id,
        invoice.customer_id,
        payDate,
        paymentAmount,
        payment_method || 'UPI',
        transaction_reference || null,
        notes || null,
        req.user.id
      ]
    );

    const paymentId = paymentResult.insertId;

    // 4. Update Invoice Paid Amount, Balance, and Status
    const newPaidAmount = Math.round((Number(invoice.paid_amount) + paymentAmount) * 100) / 100;
    const newBalanceAmount = Math.max(0, Math.round((Number(invoice.grand_total) - newPaidAmount) * 100) / 100);
    const newStatus = newBalanceAmount <= 0 ? 'PAID' : 'PARTIALLY PAID';

    await connection.execute(
      'UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ? WHERE id = ?',
      [newPaidAmount, newBalanceAmount, newStatus, invoice.id]
    );

    // 5. Generate Safe Sequential Receipt Number
    const receiptNumber = await getNextReceiptNumber(connection, settings.receipt_prefix || 'REC');

    // 6. Build Receipt Payload for QR & PDF
    const receiptObj = {
      receipt_number: receiptNumber,
      payment_id: paymentId,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      customer_id: invoice.customer_id,
      receipt_date: payDate,
      amount: paymentAmount,
      payment_method: payment_method || 'UPI',
      transaction_reference: transaction_reference || null,
      notes: notes || null
    };

    const updatedInvoiceObj = {
      ...invoice,
      paid_amount: newPaidAmount,
      balance_amount: newBalanceAmount,
      status: newStatus
    };

    // 7. Generate Verification QR code
    const qrResult = await generateReceiptQRCode(receiptObj, settings);

    // 8. Generate Payment Receipt PDF
    const pdfResult = await generateReceiptPdf(
      receiptObj,
      updatedInvoiceObj,
      customer,
      receiptObj,
      settings,
      qrResult ? qrResult.dataUrl : null
    );

    // 9. Insert Receipt Record
    const [receiptResult] = await connection.execute(
      `INSERT INTO receipts (
        receipt_number, payment_id, invoice_id, customer_id,
        receipt_date, amount, pdf_path, qr_path, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        receiptNumber,
        paymentId,
        invoice.id,
        invoice.customer_id,
        payDate,
        paymentAmount,
        pdfResult.relativeUrl,
        qrResult ? qrResult.relativeUrl : null,
        req.user.id
      ]
    );

    const receiptId = receiptResult.insertId;

    // 10. Update Invoice's own PDF so it reflects recent payment & balance
    try {
      const [items] = await connection.execute('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoice.id]);
      const invQrResult = await generateInvoiceQRCode(updatedInvoiceObj, settings);
      const invPdfResult = await generateInvoicePdf(updatedInvoiceObj, items, customer, settings, invQrResult ? invQrResult.dataUrl : null);
      await connection.execute('UPDATE invoices SET pdf_path = ?, qr_path = ? WHERE id = ?', [invPdfResult.relativeUrl, invQrResult.relativeUrl, invoice.id]);
    } catch (invPdfErr) {
      console.error('Non-blocking error updating invoice PDF after payment:', invPdfErr);
    }

    // Commit Transaction
    await connection.commit();

    await logAudit(
      req.user,
      'RECORD_PAYMENT',
      'PAYMENTS',
      paymentId,
      `Recorded payment of ₹${paymentAmount} for Invoice ${invoice.invoice_number}. Generated Receipt: ${receiptNumber}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: `Payment of ₹${paymentAmount.toFixed(2)} recorded! Receipt ${receiptNumber} generated.`,
      paymentId,
      receiptId,
      receiptNumber,
      receiptPdfUrl: pdfResult.relativeUrl,
      invoiceStatus: newStatus,
      newBalance: newBalanceAmount
    });
  } catch (error) {
    await connection.rollback();
    console.error('Payment recording transaction rollback:', error);
    next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  getPayments,
  recordPayment
};
