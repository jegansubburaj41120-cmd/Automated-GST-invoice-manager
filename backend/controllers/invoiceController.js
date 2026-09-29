const path = require('path');
const fs = require('fs');
const { query, getConnection } = require('../config/db');
const { calculateInvoiceTotals } = require('../services/gstEngine');
const { formatDocumentNumber, getFinancialYear } = require('../utils/financialYear');
const { generateInvoiceQRCode } = require('../services/qrCodeService');
const { generateInvoicePdf } = require('../services/invoicePdfService');
const { logAudit } = require('../middleware/auditLogger');

/**
 * Generate next sequential invoice number safely
 */
async function getNextInvoiceNumber(connection, prefix = 'INV') {
  const currentFy = getFinancialYear();
  const pattern = `${prefix}/${currentFy}/%`;

  const [rows] = await connection.execute(
    'SELECT invoice_number FROM invoices WHERE invoice_number LIKE ? ORDER BY id DESC LIMIT 1 FOR UPDATE',
    [pattern]
  );

  let nextSeq = 1;
  if (rows && rows.length > 0) {
    const parts = rows[0].invoice_number.split('/');
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
 * Get all invoices with search, filters, pagination
 */
async function getInvoices(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const status = req.query.status || null;
    const fromDate = req.query.from_date || null;
    const toDate = req.query.to_date || null;
    const customerId = req.query.customer_id || null;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push('(i.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR c.gstin LIKE ?)');
      params.push(search, search, search, search);
    }

    if (status) {
      whereConditions.push('i.status = ?');
      params.push(status);
    }

    if (customerId) {
      whereConditions.push('i.customer_id = ?');
      params.push(customerId);
    }

    if (fromDate) {
      whereConditions.push('i.invoice_date >= ?');
      params.push(fromDate);
    }

    if (toDate) {
      whereConditions.push('i.invoice_date <= ?');
      params.push(toDate);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM invoices i JOIN customers c ON i.customer_id = c.id ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const sql = `
      SELECT 
        i.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.gstin as customer_gstin,
        c.state as customer_state,
        c.state_code as customer_state_code,
        u.name as created_by_name
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      LEFT JOIN users u ON i.created_by = u.id
      ${whereClause}
      ORDER BY i.id DESC
      LIMIT ? OFFSET ?
    `;

    const invoices = await query(sql, [...params, limit, offset]);

    res.json({
      success: true,
      data: invoices,
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
 * Get single invoice with items, payments, receipts
 */
async function getInvoiceById(req, res, next) {
  try {
    const invoiceId = req.params.id;

    const invoices = await query(
      `SELECT i.*, 
        c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
        c.gstin as customer_gstin, c.pan as customer_pan, c.billing_address as customer_billing_address,
        c.state as customer_state, c.state_code as customer_state_code, c.city as customer_city,
        c.pincode as customer_pincode, c.customer_type,
        u.name as created_by_name
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       LEFT JOIN users u ON i.created_by = u.id
       WHERE i.id = ?`,
      [invoiceId]
    );

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const invoice = invoices[0];

    // Items
    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC', [invoiceId]);

    // Payments & Receipts
    const payments = await query(
      `SELECT p.*, r.id as receipt_id, r.receipt_number, r.pdf_path as receipt_pdf, u.name as recorded_by
       FROM payments p
       LEFT JOIN receipts r ON r.payment_id = p.id
       LEFT JOIN users u ON p.created_by = u.id
       WHERE p.invoice_id = ?
       ORDER BY p.payment_date DESC, p.id DESC`,
      [invoiceId]
    );

    // Settings
    const settings = (await query('SELECT * FROM settings WHERE id = 1'))[0] || {};

    res.json({
      success: true,
      data: {
        invoice,
        items,
        payments,
        settings
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create Invoice with MySQL Transaction, GST recalculation, PDF & QR generation
 */
async function createInvoice(req, res, next) {
  const connection = await getConnection();

  try {
    const {
      customer_id,
      invoice_date,
      due_date,
      payment_terms,
      place_of_supply,
      items,
      invoice_discount,
      notes
    } = req.body;

    if (!customer_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer and at least one line item are required.'
      });
    }

    // Begin Database Transaction
    await connection.beginTransaction();

    // 1. Fetch Customer details
    const [customers] = await connection.execute('SELECT * FROM customers WHERE id = ?', [customer_id]);
    if (!customers || customers.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Selected customer not found.' });
    }
    const customer = customers[0];

    // 2. Fetch Settings for Company State Code & prefixes
    const [settingsList] = await connection.execute('SELECT * FROM settings WHERE id = 1');
    const settings = settingsList[0] || { state_code: '27', state: 'Maharashtra', invoice_prefix: 'INV' };

    // 3. Determine Supply details
    const supplyState = place_of_supply || customer.state;
    const supplyCode = customer.state_code;

    // 4. Calculate full GST breakdown in backend engine
    const calculated = calculateInvoiceTotals(items, settings.state_code, customer.state_code, invoice_discount || 0);

    // 5. Generate Safe Sequential Invoice Number
    const invoiceNumber = await getNextInvoiceNumber(connection, settings.invoice_prefix || 'INV');

    // 6. Insert Invoice Record
    const [invoiceResult] = await connection.execute(
      `INSERT INTO invoices (
        invoice_number, customer_id, invoice_date, due_date,
        place_of_supply, place_of_supply_code, is_inter_state, payment_terms,
        subtotal, discount_amount, taxable_amount,
        cgst_amount, sgst_amount, igst_amount, total_tax,
        round_off, grand_total, paid_amount, balance_amount,
        status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'UNPAID', ?, ?)`,
      [
        invoiceNumber,
        customer.id,
        invoice_date || new Date().toISOString().split('T')[0],
        due_date || new Date().toISOString().split('T')[0],
        supplyState,
        supplyCode,
        calculated.isInterState ? 1 : 0,
        payment_terms || 'Due on Receipt',
        calculated.subtotal,
        calculated.discountAmount,
        calculated.taxableAmount,
        calculated.cgstAmount,
        calculated.sgstAmount,
        calculated.igstAmount,
        calculated.totalTax,
        calculated.roundOff,
        calculated.grandTotal,
        calculated.grandTotal, // initial balance = grand total
        notes || null,
        req.user.id
      ]
    );

    const invoiceId = invoiceResult.insertId;

    // 7. Insert Invoice Items and adjust stock
    for (const item of calculated.items) {
      await connection.execute(
        `INSERT INTO invoice_items (
          invoice_id, product_id, product_name, hsn_code, quantity, unit,
          unit_price, discount_percent, discount_amount, taxable_value,
          gst_rate, cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount,
          line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          item.product_id || null,
          item.product_name,
          item.hsn_code || '---',
          item.quantity,
          item.unit || 'NOS',
          item.unit_price,
          item.discount_percent,
          item.discount_amount,
          item.taxable_value,
          item.gst_rate,
          item.cgst_rate,
          item.cgst_amount,
          item.sgst_rate,
          item.sgst_amount,
          item.igst_rate,
          item.igst_amount,
          item.line_total
        ]
      );

      // Decrement product stock if product_id exists
      if (item.product_id) {
        await connection.execute(
          'UPDATE products SET stock_quantity = GREATEST(0, stock_quantity - ?) WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
    }

    // 8. Generate QR Code
    const invoiceObj = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      invoice_date: invoice_date || new Date(),
      due_date: due_date || new Date(),
      place_of_supply: supplyState,
      place_of_supply_code: supplyCode,
      is_inter_state: calculated.isInterState,
      payment_terms: payment_terms || 'Due on Receipt',
      subtotal: calculated.subtotal,
      discount_amount: calculated.discountAmount,
      taxable_amount: calculated.taxableAmount,
      cgst_amount: calculated.cgstAmount,
      sgst_amount: calculated.sgstAmount,
      igst_amount: calculated.igstAmount,
      round_off: calculated.roundOff,
      grand_total: calculated.grandTotal,
      paid_amount: 0,
      balance_amount: calculated.grandTotal,
      status: 'UNPAID'
    };

    const qrResult = await generateInvoiceQRCode(invoiceObj, settings);

    // 9. Generate Invoice PDF
    const pdfResult = await generateInvoicePdf(
      invoiceObj,
      calculated.items,
      customer,
      settings,
      qrResult ? qrResult.dataUrl : null
    );

    // 10. Update Invoice with PDF & QR paths
    await connection.execute(
      'UPDATE invoices SET pdf_path = ?, qr_path = ? WHERE id = ?',
      [pdfResult.relativeUrl, qrResult ? qrResult.relativeUrl : null, invoiceId]
    );

    // Commit Transaction
    await connection.commit();

    await logAudit(
      req.user,
      'CREATE_INVOICE',
      'INVOICES',
      invoiceId,
      `Generated Invoice ${invoiceNumber} for ${customer.name} totaling ₹${calculated.grandTotal}`,
      req.ip
    );

    res.status(201).json({
      success: true,
      message: `Invoice ${invoiceNumber} created successfully!`,
      invoiceId,
      invoiceNumber,
      pdfUrl: pdfResult.relativeUrl
    });
  } catch (error) {
    await connection.rollback();
    console.error('Invoice creation rollback:', error);
    next(error);
  } finally {
    connection.release();
  }
}

/**
 * Regenerate PDF for an invoice
 */
async function regenerateInvoicePdf(req, res, next) {
  try {
    const invoiceId = req.params.id;
    const [invoices] = await query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    const invoice = invoices[0];
    const customer = (await query('SELECT * FROM customers WHERE id = ?', [invoice.customer_id]))[0];
    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
    const settings = (await query('SELECT * FROM settings WHERE id = 1'))[0] || {};

    const qrResult = await generateInvoiceQRCode(invoice, settings);
    const pdfResult = await generateInvoicePdf(invoice, items, customer, settings, qrResult ? qrResult.dataUrl : null);

    await query('UPDATE invoices SET pdf_path = ?, qr_path = ? WHERE id = ?', [pdfResult.relativeUrl, qrResult.relativeUrl, invoiceId]);

    res.json({
      success: true,
      message: 'Invoice PDF regenerated successfully.',
      pdfUrl: pdfResult.relativeUrl
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete invoice (Admin only)
 */
async function deleteInvoice(req, res, next) {
  const connection = await getConnection();
  try {
    const invoiceId = req.params.id;

    await connection.beginTransaction();

    const [invoices] = await connection.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    if (!invoices || invoices.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    const invoice = invoices[0];

    // Revert product stock
    const [items] = await connection.execute('SELECT product_id, quantity FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
    for (const item of items) {
      if (item.product_id) {
        await connection.execute('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
    }

    await connection.execute('DELETE FROM invoices WHERE id = ?', [invoiceId]);
    await connection.commit();

    await logAudit(req.user, 'DELETE_INVOICE', 'INVOICES', invoiceId, `Deleted Invoice ${invoice.invoice_number}`, req.ip);

    res.json({
      success: true,
      message: 'Invoice deleted successfully and stock quantities restored.'
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  regenerateInvoicePdf,
  deleteInvoice
};
