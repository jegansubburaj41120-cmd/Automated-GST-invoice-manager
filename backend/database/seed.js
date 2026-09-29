const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const config = require('../config/config');
const initializeDatabase = require('./initDb');
const { calculateInvoiceTotals } = require('../services/gstEngine');
const { generateInvoiceQRCode, generateReceiptQRCode } = require('../services/qrCodeService');
const { generateInvoicePdf } = require('../services/invoicePdfService');
const { generateReceiptPdf } = require('../services/receiptPdfService');
const { formatDocumentNumber } = require('../utils/financialYear');

async function seedDatabase() {
  console.log('🌱 Starting Database Seeding Process...');

  // 1. Ensure DB and tables exist
  await initializeDatabase();

  const connection = await mysql.createConnection({
    host: config.db.host,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    port: config.db.port
  });

  try {
    // 2. Seed Users (Admin & Staff)
    console.log('Creating Admin and Staff accounts...');
    const salt = await bcrypt.genSalt(10);
    const adminPass = await bcrypt.hash('Admin@123', salt);
    const staffPass = await bcrypt.hash('Staff@123', salt);

    await connection.execute(
      `INSERT INTO users (id, name, email, password, role, phone, status)
       VALUES 
       (1, 'Admin Administrator', 'admin@gstmanager.com', ?, 'admin', '+91 9876543210', 'active'),
       (2, 'Priya Sharma (Staff)', 'staff@gstmanager.com', ?, 'staff', '+91 9876543211', 'active')
       ON DUPLICATE KEY UPDATE password = VALUES(password)`,
      [adminPass, staffPass]
    );

    // 3. Seed GST Rates
    console.log('Seeding GST Rates...');
    await connection.execute(`
      INSERT INTO gst_rates (id, rate_percentage, label, description) VALUES
      (1, 0.00, 'GST 0%', 'Nil rated goods and essential commodities'),
      (2, 5.00, 'GST 5%', 'Household necessities, basic goods'),
      (3, 12.00, 'GST 12%', 'Standard rate for computers and processed foods'),
      (4, 18.00, 'GST 18%', 'Standard rate for IT services, capital goods & electronics'),
      (5, 28.00, 'GST 28%', 'Luxury goods, motor vehicles, air conditioners')
      ON DUPLICATE KEY UPDATE label = VALUES(label)
    `);

    // 4. Seed Company Settings
    console.log('Seeding Company Settings...');
    await connection.execute(`
      INSERT INTO settings (
        id, company_name, business_address, city, state, state_code, pincode,
        phone, email, website, gstin, pan, bank_name, account_number, ifsc, upi_id,
        invoice_prefix, receipt_prefix, terms_conditions, authorized_signatory, designation
      ) VALUES (
        1,
        'Apex Tech & GST Solutions Pvt Ltd',
        'Floor 4, Cyber Park, Andheri East',
        'Mumbai',
        'Maharashtra',
        '27',
        '400069',
        '+91 9820011223',
        'billing@apextech.in',
        'https://www.apextech.in',
        '27AAACA1234F1Z5',
        'AAACA1234F',
        'HDFC Bank Ltd',
        '50200012345678',
        'HDFC0001234',
        'apextech@hdfcbank',
        'INV',
        'REC',
        '1. Goods/services once delivered cannot be cancelled. 2. Interest @18% p.a. will be charged on overdue payments. 3. Subject to Mumbai Jurisdiction.',
        'Rajesh Kulkarni',
        'Managing Director'
      ) ON DUPLICATE KEY UPDATE company_name = VALUES(company_name), gstin = VALUES(gstin), state_code = VALUES(state_code)
    `);

    // 5. Seed Customers
    console.log('Seeding Customers...');
    await connection.execute(`
      INSERT INTO customers (id, name, email, phone, gstin, pan, customer_type, billing_address, city, state, state_code, pincode, created_by) VALUES
      (1, 'Reliance Digital Retail Ltd', 'accounts@relianceretail.com', '+91 9820123456', '27AAACR1234F1ZV', 'AAACR1234F', 'registered', 'Maker Chambers IV, Nariman Point', 'Mumbai', 'Maharashtra', '27', '400021', 1),
      (2, 'Tata Consultancy Services Ltd', 'finance@tcs.com', '+91 9820987654', '27AAACT1234F1ZW', 'AAACT1234F', 'registered', 'TCS House, Raveline Street, Fort', 'Mumbai', 'Maharashtra', '27', '400001', 1),
      (3, 'Infosys Technologies Bangalore', 'invoicing@infosys.com', '+91 9845123456', '29AAACI1234F1ZX', 'AAACI1234F', 'registered', 'Electronics City, Hosur Road', 'Bangalore', 'Karnataka', '29', '560100', 1),
      (4, 'Gujarat Industrial Automation', 'procurement@guiauto.com', '+91 9898123456', '24AAACG1234F1ZY', 'AAACG1234F', 'registered', 'GIDC Industrial Estate, Vatva', 'Ahmedabad', 'Gujarat', '24', '382445', 1),
      (5, 'Sharma Walk-in Consumer', 'rajesh.sharma@gmail.com', '+91 9811223344', NULL, 'ABCPS1234F', 'unregistered', 'Flat 402, Green Valley Apartments', 'Pune', 'Maharashtra', '27', '411001', 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

    // 6. Seed Products
    console.log('Seeding Products...');
    await connection.execute(`
      INSERT INTO products (id, name, sku, hsn_code, category, unit, selling_price, gst_rate, stock_quantity, low_stock_threshold, description, is_active, created_by) VALUES
      (1, 'Dell Latitude Enterprise Laptop i7', 'LAP-DELL-01', '84713010', 'Hardware', 'NOS', 65000.00, 18.00, 45, 5, 'High performance 16GB RAM 512GB SSD Laptop', 1, 1),
      (2, 'Samsung 27" 4K UHD IPS Monitor', 'MON-SAM-27', '85285200', 'Hardware', 'NOS', 24500.00, 18.00, 28, 4, 'Ergonomic borderless 4K designer monitor', 1, 1),
      (3, 'Logitech MX Master 3S Wireless Mouse', 'ACC-LOG-MX3', '84716060', 'Accessories', 'NOS', 8999.00, 18.00, 60, 10, 'Ultra-fast quiet scrolling bluetooth mouse', 1, 1),
      (4, 'Ergonomic Mesh Office Chair Pro', 'FUR-CHAIR-01', '94013000', 'Furniture', 'NOS', 14500.00, 18.00, 15, 3, 'High back lumbar support breathable mesh chair', 1, 1),
      (5, 'Cloud GST Billing & ERP Software License (Annual)', 'SFT-GST-01', '998314', 'Software', 'PAC', 18000.00, 18.00, 999, 10, 'Single business annual multi-user license', 1, 1),
      (6, 'Thermal Billing Paper Rolls (50 Pack)', 'STA-PAP-01', '48025400', 'Stationery', 'BOX', 1250.00, 12.00, 120, 15, '80mm BPA-free heavy duty thermal paper rolls', 1, 1),
      (7, 'GST Accounting Consultation Services', 'SRV-GST-CON', '998231', 'Services', 'HRS', 2500.00, 18.00, 500, 10, 'Professional GST audit and reconciliation hourly service', 1, 1),
      (8, 'Honeywell 2D Desktop QR & Barcode Scanner', 'SCN-HON-01', '84719000', 'Hardware', 'NOS', 4800.00, 18.00, 35, 5, 'Hands-free omnidirectional presentation scanner', 1, 1),
      (9, 'Organic Green Tea (Pack of 50 Bags)', 'BEV-TEA-01', '09021020', 'Pantry', 'BOX', 450.00, 5.00, 80, 10, 'Pure whole leaf natural antioxidant green tea', 1, 1),
      (10, 'Printed Cotton Corporate Tote Bags (Set of 100)', 'PRO-BAG-01', '42022220', 'Marketing', 'SET', 3200.00, 5.00, 50, 5, 'Eco-friendly branded canvas giveaway bags', 1, 1)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);

    // 7. Generate Real Initial Invoices and Payment Receipts to test end-to-end
    console.log('Seeding Sample Invoices and Verified Receipts...');

    const [settingsRows] = await connection.execute('SELECT * FROM settings WHERE id = 1');
    const settings = settingsRows[0];

    // Invoice 1: Intra-state Maharashtra (Reliance Retail) - PAID
    const [cust1] = await connection.execute('SELECT * FROM customers WHERE id = 1');
    const invoice1Items = [
      { product_id: 1, product_name: 'Dell Latitude Enterprise Laptop i7', hsn_code: '84713010', quantity: 2, unit: 'NOS', unit_price: 65000.00, discount_percent: 5, gst_rate: 18.00 },
      { product_id: 3, product_name: 'Logitech MX Master 3S Wireless Mouse', hsn_code: '84716060', quantity: 2, unit: 'NOS', unit_price: 8999.00, discount_percent: 0, gst_rate: 18.00 }
    ];
    const calc1 = calculateInvoiceTotals(invoice1Items, settings.state_code, cust1[0].state_code, 0);
    const inv1Num = formatDocumentNumber('INV', 1);

    const [inv1Result] = await connection.execute(
      `INSERT INTO invoices (
        id, invoice_number, customer_id, invoice_date, due_date, place_of_supply, place_of_supply_code, is_inter_state,
        subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax, round_off, grand_total,
        paid_amount, balance_amount, status, payment_terms, notes, created_by
      ) VALUES (
        1, ?, 1, CURDATE() - INTERVAL 12 DAY, CURDATE() + INTERVAL 18 DAY, 'Maharashtra', '27', 0,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, 0.00, 'PAID', 'Net 30', 'Corporate bulk purchase', 1
      ) ON DUPLICATE KEY UPDATE invoice_number = VALUES(invoice_number)`,
      [
        inv1Num,
        calc1.subtotal, calc1.discountAmount, calc1.taxableAmount, calc1.cgstAmount, calc1.sgstAmount, calc1.igstAmount,
        calc1.totalTax, calc1.roundOff, calc1.grandTotal, calc1.grandTotal
      ]
    );

    // Insert Invoice Items 1
    await connection.execute('DELETE FROM invoice_items WHERE invoice_id = 1');
    for (const itm of calc1.items) {
      await connection.execute(
        `INSERT INTO invoice_items (
          invoice_id, product_id, product_name, hsn_code, quantity, unit, unit_price,
          discount_percent, discount_amount, taxable_value, gst_rate, cgst_rate, cgst_amount,
          sgst_rate, sgst_amount, igst_rate, igst_amount, line_total
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itm.product_id, itm.product_name, itm.hsn_code, itm.quantity, itm.unit, itm.unit_price,
          itm.discount_percent, itm.discount_amount, itm.taxable_value, itm.gst_rate,
          itm.cgst_rate, itm.cgst_amount, itm.sgst_rate, itm.sgst_amount, itm.igst_rate, itm.igst_amount,
          itm.line_total
        ]
      );
    }

    // Payment 1 for Invoice 1
    const rec1Num = formatDocumentNumber('REC', 1);
    await connection.execute('DELETE FROM receipts WHERE invoice_id = 1');
    await connection.execute('DELETE FROM payments WHERE invoice_id = 1');

    const [pay1Result] = await connection.execute(
      `INSERT INTO payments (
        id, invoice_id, customer_id, payment_date, amount, payment_method, transaction_reference, notes, created_by
      ) VALUES (
        1, 1, 1, CURDATE() - INTERVAL 10 DAY, ?, 'Bank Transfer', 'HDFCN26123456789', 'NEFT Bank Transfer received', 1
      )`,
      [calc1.grandTotal]
    );

    // Invoice 1 PDF & QR
    const inv1Obj = {
      id: 1,
      invoice_number: inv1Num,
      invoice_date: new Date(),
      due_date: new Date(),
      place_of_supply: 'Maharashtra',
      place_of_supply_code: '27',
      is_inter_state: false,
      subtotal: calc1.subtotal,
      discount_amount: calc1.discountAmount,
      taxable_amount: calc1.taxableAmount,
      cgst_amount: calc1.cgstAmount,
      sgst_amount: calc1.sgstAmount,
      igst_amount: calc1.igstAmount,
      round_off: calc1.roundOff,
      grand_total: calc1.grandTotal,
      paid_amount: calc1.grandTotal,
      balance_amount: 0,
      status: 'PAID'
    };

    const qr1 = await generateInvoiceQRCode(inv1Obj, settings);
    const pdf1 = await generateInvoicePdf(inv1Obj, calc1.items, cust1[0], settings, qr1 ? qr1.dataUrl : null);
    await connection.execute('UPDATE invoices SET pdf_path = ?, qr_path = ? WHERE id = 1', [pdf1.relativeUrl, qr1 ? qr1.relativeUrl : null]);

    // Receipt 1 PDF & QR
    const rec1Obj = {
      receipt_number: rec1Num,
      payment_id: 1,
      invoice_id: 1,
      invoice_number: inv1Num,
      customer_id: 1,
      receipt_date: new Date().toISOString().split('T')[0],
      amount: calc1.grandTotal,
      payment_method: 'Bank Transfer',
      transaction_reference: 'HDFCN26123456789'
    };
    const qrRec1 = await generateReceiptQRCode(rec1Obj, settings);
    const pdfRec1 = await generateReceiptPdf(rec1Obj, inv1Obj, cust1[0], rec1Obj, settings, qrRec1 ? qrRec1.dataUrl : null);

    await connection.execute(
      `INSERT INTO receipts (
        id, receipt_number, payment_id, invoice_id, customer_id, receipt_date, amount, pdf_path, qr_path, created_by
      ) VALUES (
        1, ?, 1, 1, 1, CURDATE() - INTERVAL 10 DAY, ?, ?, ?, 1
      )`,
      [rec1Num, calc1.grandTotal, pdfRec1.relativeUrl, qrRec1 ? qrRec1.relativeUrl : null]
    );

    // Invoice 2: Inter-State Karnataka (Infosys) - PARTIALLY PAID (IGST Calculation test)
    const [cust3] = await connection.execute('SELECT * FROM customers WHERE id = 3');
    const invoice2Items = [
      { product_id: 5, product_name: 'Cloud GST Billing & ERP Software License (Annual)', hsn_code: '998314', quantity: 3, unit: 'PAC', unit_price: 18000.00, discount_percent: 0, gst_rate: 18.00 },
      { product_id: 7, product_name: 'GST Accounting Consultation Services', hsn_code: '998231', quantity: 10, unit: 'HRS', unit_price: 2500.00, discount_percent: 10, gst_rate: 18.00 }
    ];
    const calc2 = calculateInvoiceTotals(invoice2Items, settings.state_code, cust3[0].state_code, 0);
    const inv2Num = formatDocumentNumber('INV', 2);
    const partialPay = 40000.00;
    const partialBal = calc2.grandTotal - partialPay;

    await connection.execute(
      `INSERT INTO invoices (
        id, invoice_number, customer_id, invoice_date, due_date, place_of_supply, place_of_supply_code, is_inter_state,
        subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax, round_off, grand_total,
        paid_amount, balance_amount, status, payment_terms, notes, created_by
      ) VALUES (
        2, ?, 3, CURDATE() - INTERVAL 5 DAY, CURDATE() + INTERVAL 25 DAY, 'Karnataka', '29', 1,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, 'PARTIALLY PAID', 'Net 30', 'Inter-state software implementation', 1
      ) ON DUPLICATE KEY UPDATE invoice_number = VALUES(invoice_number)`,
      [
        inv2Num,
        calc2.subtotal, calc2.discountAmount, calc2.taxableAmount, calc2.cgstAmount, calc2.sgstAmount, calc2.igstAmount,
        calc2.totalTax, calc2.roundOff, calc2.grandTotal, partialPay, partialBal
      ]
    );

    await connection.execute('DELETE FROM invoice_items WHERE invoice_id = 2');
    for (const itm of calc2.items) {
      await connection.execute(
        `INSERT INTO invoice_items (
          invoice_id, product_id, product_name, hsn_code, quantity, unit, unit_price,
          discount_percent, discount_amount, taxable_value, gst_rate, cgst_rate, cgst_amount,
          sgst_rate, sgst_amount, igst_rate, igst_amount, line_total
        ) VALUES (2, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itm.product_id, itm.product_name, itm.hsn_code, itm.quantity, itm.unit, itm.unit_price,
          itm.discount_percent, itm.discount_amount, itm.taxable_value, itm.gst_rate,
          itm.cgst_rate, itm.cgst_amount, itm.sgst_rate, itm.sgst_amount, itm.igst_rate, itm.igst_amount,
          itm.line_total
        ]
      );
    }

    const rec2Num = formatDocumentNumber('REC', 2);
    await connection.execute('DELETE FROM receipts WHERE invoice_id = 2');
    await connection.execute('DELETE FROM payments WHERE invoice_id = 2');

    await connection.execute(
      `INSERT INTO payments (
        id, invoice_id, customer_id, payment_date, amount, payment_method, transaction_reference, notes, created_by
      ) VALUES (
        2, 2, 3, CURDATE() - INTERVAL 3 DAY, ?, 'UPI', 'UPI/2026/INFOSYS987', 'Partial advance via UPI', 1
      )`,
      [partialPay]
    );

    const inv2Obj = {
      id: 2,
      invoice_number: inv2Num,
      invoice_date: new Date(),
      due_date: new Date(),
      place_of_supply: 'Karnataka',
      place_of_supply_code: '29',
      is_inter_state: true,
      subtotal: calc2.subtotal,
      discount_amount: calc2.discountAmount,
      taxable_amount: calc2.taxableAmount,
      cgst_amount: calc2.cgstAmount,
      sgst_amount: calc2.sgstAmount,
      igst_amount: calc2.igstAmount,
      round_off: calc2.roundOff,
      grand_total: calc2.grandTotal,
      paid_amount: partialPay,
      balance_amount: partialBal,
      status: 'PARTIALLY PAID'
    };
    const qr2 = await generateInvoiceQRCode(inv2Obj, settings);
    const pdf2 = await generateInvoicePdf(inv2Obj, calc2.items, cust3[0], settings, qr2 ? qr2.dataUrl : null);
    await connection.execute('UPDATE invoices SET pdf_path = ?, qr_path = ? WHERE id = 2', [pdf2.relativeUrl, qr2 ? qr2.relativeUrl : null]);

    const rec2Obj = {
      receipt_number: rec2Num,
      payment_id: 2,
      invoice_id: 2,
      invoice_number: inv2Num,
      customer_id: 3,
      receipt_date: new Date().toISOString().split('T')[0],
      amount: partialPay,
      payment_method: 'UPI',
      transaction_reference: 'UPI/2026/INFOSYS987'
    };
    const qrRec2 = await generateReceiptQRCode(rec2Obj, settings);
    const pdfRec2 = await generateReceiptPdf(rec2Obj, inv2Obj, cust3[0], rec2Obj, settings, qrRec2 ? qrRec2.dataUrl : null);

    await connection.execute(
      `INSERT INTO receipts (
        id, receipt_number, payment_id, invoice_id, customer_id, receipt_date, amount, pdf_path, qr_path, created_by
      ) VALUES (
        2, ?, 2, 2, 3, CURDATE() - INTERVAL 3 DAY, ?, ?, ?, 1
      )`,
      [rec2Num, partialPay, pdfRec2.relativeUrl, qrRec2 ? qrRec2.relativeUrl : null]
    );

    // Invoice 3: UNPAID (Gujarat Industrial Automation)
    const [cust4] = await connection.execute('SELECT * FROM customers WHERE id = 4');
    const invoice3Items = [
      { product_id: 2, product_name: 'Samsung 27" 4K UHD IPS Monitor', hsn_code: '85285200', quantity: 4, unit: 'NOS', unit_price: 24500.00, discount_percent: 0, gst_rate: 18.00 },
      { product_id: 8, product_name: 'Honeywell 2D Desktop QR & Barcode Scanner', hsn_code: '84719000', quantity: 2, unit: 'NOS', unit_price: 4800.00, discount_percent: 0, gst_rate: 18.00 }
    ];
    const calc3 = calculateInvoiceTotals(invoice3Items, settings.state_code, cust4[0].state_code, 0);
    const inv3Num = formatDocumentNumber('INV', 3);

    await connection.execute(
      `INSERT INTO invoices (
        id, invoice_number, customer_id, invoice_date, due_date, place_of_supply, place_of_supply_code, is_inter_state,
        subtotal, discount_amount, taxable_amount, cgst_amount, sgst_amount, igst_amount, total_tax, round_off, grand_total,
        paid_amount, balance_amount, status, payment_terms, notes, created_by
      ) VALUES (
        3, ?, 4, CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 14 DAY, 'Gujarat', '24', 1,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        0.00, ?, 'UNPAID', 'Due in 15 Days', 'Awaiting payment confirmation', 1
      ) ON DUPLICATE KEY UPDATE invoice_number = VALUES(invoice_number)`,
      [
        inv3Num,
        calc3.subtotal, calc3.discountAmount, calc3.taxableAmount, calc3.cgstAmount, calc3.sgstAmount, calc3.igstAmount,
        calc3.totalTax, calc3.roundOff, calc3.grandTotal, calc3.grandTotal
      ]
    );

    await connection.execute('DELETE FROM invoice_items WHERE invoice_id = 3');
    for (const itm of calc3.items) {
      await connection.execute(
        `INSERT INTO invoice_items (
          invoice_id, product_id, product_name, hsn_code, quantity, unit, unit_price,
          discount_percent, discount_amount, taxable_value, gst_rate, cgst_rate, cgst_amount,
          sgst_rate, sgst_amount, igst_rate, igst_amount, line_total
        ) VALUES (3, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          itm.product_id, itm.product_name, itm.hsn_code, itm.quantity, itm.unit, itm.unit_price,
          itm.discount_percent, itm.discount_amount, itm.taxable_value, itm.gst_rate,
          itm.cgst_rate, itm.cgst_amount, itm.sgst_rate, itm.sgst_amount, itm.igst_rate, itm.igst_amount,
          itm.line_total
        ]
      );
    }

    const inv3Obj = {
      id: 3,
      invoice_number: inv3Num,
      invoice_date: new Date(),
      due_date: new Date(),
      place_of_supply: 'Gujarat',
      place_of_supply_code: '24',
      is_inter_state: true,
      subtotal: calc3.subtotal,
      discount_amount: calc3.discountAmount,
      taxable_amount: calc3.taxableAmount,
      cgst_amount: calc3.cgstAmount,
      sgst_amount: calc3.sgstAmount,
      igst_amount: calc3.igstAmount,
      round_off: calc3.roundOff,
      grand_total: calc3.grandTotal,
      paid_amount: 0,
      balance_amount: calc3.grandTotal,
      status: 'UNPAID'
    };
    const qr3 = await generateInvoiceQRCode(inv3Obj, settings);
    const pdf3 = await generateInvoicePdf(inv3Obj, calc3.items, cust4[0], settings, qr3 ? qr3.dataUrl : null);
    await connection.execute('UPDATE invoices SET pdf_path = ?, qr_path = ? WHERE id = 3', [pdf3.relativeUrl, qr3 ? qr3.relativeUrl : null]);

    console.log('✅ Database Seeded Successfully with Admin, Staff, Customers, Products, Invoices, Payments, Receipts & PDFs!');
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
