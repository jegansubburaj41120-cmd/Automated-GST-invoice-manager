const { query } = require('../config/db');

/**
 * Get Dashboard KPIs and Chart Analytics
 */
async function getDashboardData(req, res, next) {
  try {
    // 1. KPI Cards
    const statsSql = `
      SELECT
        (SELECT COALESCE(SUM(grand_total), 0) FROM invoices) as total_sales,
        (SELECT COALESCE(SUM(total_tax), 0) FROM invoices) as total_gst_collected,
        (SELECT COUNT(*) FROM invoices) as total_invoices,
        (SELECT COUNT(*) FROM receipts) as total_receipts,
        (SELECT COUNT(*) FROM customers) as total_customers,
        (SELECT COUNT(*) FROM products WHERE is_active = 1) as total_products,
        (SELECT COALESCE(SUM(balance_amount), 0) FROM invoices WHERE status != 'CANCELLED') as pending_payments,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM invoices) as total_paid_amount
    `;
    const [stats] = await query(statsSql);

    // 2. Monthly Sales & GST (Last 6-12 Months)
    const monthlySql = `
      SELECT 
        DATE_FORMAT(invoice_date, '%b %Y') as month_label,
        DATE_FORMAT(invoice_date, '%Y-%m') as sort_month,
        COALESCE(SUM(grand_total), 0) as monthly_sales,
        COALESCE(SUM(total_tax), 0) as monthly_gst,
        COALESCE(SUM(cgst_amount), 0) as monthly_cgst,
        COALESCE(SUM(sgst_amount), 0) as monthly_sgst,
        COALESCE(SUM(igst_amount), 0) as monthly_igst,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE invoice_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY sort_month, month_label
      ORDER BY sort_month ASC
    `;
    const monthlyData = await query(monthlySql);

    // 3. Monthly Receipts
    const monthlyReceiptsSql = `
      SELECT 
        DATE_FORMAT(receipt_date, '%b %Y') as month_label,
        DATE_FORMAT(receipt_date, '%Y-%m') as sort_month,
        COALESCE(SUM(amount), 0) as receipt_amount,
        COUNT(*) as receipt_count
      FROM receipts
      WHERE receipt_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY sort_month, month_label
      ORDER BY sort_month ASC
    `;
    const monthlyReceipts = await query(monthlyReceiptsSql);

    // 4. Top Selling Products
    const topProductsSql = `
      SELECT 
        product_name,
        COALESCE(SUM(quantity), 0) as total_quantity,
        COALESCE(SUM(line_total), 0) as total_revenue
      FROM invoice_items
      GROUP BY product_name
      ORDER BY total_revenue DESC
      LIMIT 5
    `;
    const topProducts = await query(topProductsSql);

    // 5. Customer-wise Sales
    const customerSalesSql = `
      SELECT 
        c.name as customer_name,
        COALESCE(SUM(i.grand_total), 0) as total_sales,
        COALESCE(SUM(i.paid_amount), 0) as total_paid,
        COALESCE(SUM(i.balance_amount), 0) as total_balance
      FROM customers c
      JOIN invoices i ON i.customer_id = c.id
      GROUP BY c.id, c.name
      ORDER BY total_sales DESC
      LIMIT 6
    `;
    const customerSales = await query(customerSalesSql);

    // 6. Recent Invoices
    const recentInvoices = await query(
      `SELECT i.*, c.name as customer_name
       FROM invoices i
       JOIN customers c ON i.customer_id = c.id
       ORDER BY i.id DESC
       LIMIT 5`
    );

    // 7. Recent Receipts
    const recentReceipts = await query(
      `SELECT r.*, i.invoice_number, c.name as customer_name, p.payment_method
       FROM receipts r
       JOIN invoices i ON r.invoice_id = i.id
       JOIN customers c ON r.customer_id = c.id
       LEFT JOIN payments p ON r.payment_id = p.id
       ORDER BY r.id DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalSales: Number(stats.total_sales || 0),
          totalGstCollected: Number(stats.total_gst_collected || 0),
          totalInvoices: Number(stats.total_invoices || 0),
          totalReceipts: Number(stats.total_receipts || 0),
          totalCustomers: Number(stats.total_customers || 0),
          totalProducts: Number(stats.total_products || 0),
          pendingPayments: Number(stats.pending_payments || 0),
          paidAmount: Number(stats.total_paid_amount || 0)
        },
        monthlyData,
        monthlyReceipts,
        topProducts,
        customerSales,
        recentInvoices,
        recentReceipts
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GST Report (GSTR-1 compliant summary)
 */
async function getGstReport(req, res, next) {
  try {
    const { from_date, to_date, customer_id } = req.query;

    let whereConditions = [];
    let params = [];

    if (from_date) {
      whereConditions.push('i.invoice_date >= ?');
      params.push(from_date);
    }

    if (to_date) {
      whereConditions.push('i.invoice_date <= ?');
      params.push(to_date);
    }

    if (customer_id) {
      whereConditions.push('i.customer_id = ?');
      params.push(customer_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        i.id,
        i.invoice_number,
        i.invoice_date,
        c.name as customer_name,
        c.gstin as customer_gstin,
        i.place_of_supply,
        i.place_of_supply_code,
        i.is_inter_state,
        i.taxable_amount,
        i.cgst_amount,
        i.sgst_amount,
        i.igst_amount,
        i.total_tax,
        i.round_off,
        i.grand_total,
        i.status
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      ${whereClause}
      ORDER BY i.invoice_date ASC
    `;

    const records = await query(sql, params);

    // Calculate Summary Totals
    const totals = records.reduce(
      (acc, r) => ({
        totalTaxable: acc.totalTaxable + Number(r.taxable_amount),
        totalCgst: acc.totalCgst + Number(r.cgst_amount),
        totalSgst: acc.totalSgst + Number(r.sgst_amount),
        totalIgst: acc.totalIgst + Number(r.igst_amount),
        totalTax: acc.totalTax + Number(r.total_tax),
        totalGrand: acc.totalGrand + Number(r.grand_total),
        invoiceCount: acc.invoiceCount + 1
      }),
      { totalTaxable: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalTax: 0, totalGrand: 0, invoiceCount: 0 }
    );

    res.json({
      success: true,
      data: records,
      totals
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Sales Report with filter
 */
async function getSalesReport(req, res, next) {
  try {
    const { from_date, to_date, status, customer_id } = req.query;

    let whereConditions = [];
    let params = [];

    if (from_date) {
      whereConditions.push('i.invoice_date >= ?');
      params.push(from_date);
    }

    if (to_date) {
      whereConditions.push('i.invoice_date <= ?');
      params.push(to_date);
    }

    if (status) {
      whereConditions.push('i.status = ?');
      params.push(status);
    }

    if (customer_id) {
      whereConditions.push('i.customer_id = ?');
      params.push(customer_id);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        i.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.gstin as customer_gstin
      FROM invoices i
      JOIN customers c ON i.customer_id = c.id
      ${whereClause}
      ORDER BY i.invoice_date DESC
    `;

    const records = await query(sql, params);

    const totals = records.reduce(
      (acc, r) => ({
        totalSubtotal: acc.totalSubtotal + Number(r.subtotal),
        totalDiscount: acc.totalDiscount + Number(r.discount_amount),
        totalTaxable: acc.totalTaxable + Number(r.taxable_amount),
        totalTax: acc.totalTax + Number(r.total_tax),
        totalGrand: acc.totalGrand + Number(r.grand_total),
        totalPaid: acc.totalPaid + Number(r.paid_amount),
        totalBalance: acc.totalBalance + Number(r.balance_amount),
        count: acc.count + 1
      }),
      { totalSubtotal: 0, totalDiscount: 0, totalTaxable: 0, totalTax: 0, totalGrand: 0, totalPaid: 0, totalBalance: 0, count: 0 }
    );

    res.json({
      success: true,
      data: records,
      totals
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Outstanding Payments Report
 */
async function getOutstandingReport(req, res, next) {
  try {
    const sql = `
      SELECT 
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone,
        c.email as customer_email,
        c.gstin as customer_gstin,
        COUNT(i.id) as pending_invoices_count,
        COALESCE(SUM(i.grand_total), 0) as total_invoiced,
        COALESCE(SUM(i.paid_amount), 0) as total_paid,
        COALESCE(SUM(i.balance_amount), 0) as total_outstanding,
        MIN(i.due_date) as earliest_due_date
      FROM customers c
      JOIN invoices i ON i.customer_id = c.id
      WHERE i.balance_amount > 0 AND i.status != 'CANCELLED'
      GROUP BY c.id, c.name, c.phone, c.email, c.gstin
      ORDER BY total_outstanding DESC
    `;

    const records = await query(sql);

    const totalOutstandingSum = records.reduce((acc, r) => acc + Number(r.total_outstanding), 0);

    res.json({
      success: true,
      data: records,
      totalOutstandingSum
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardData,
  getGstReport,
  getSalesReport,
  getOutstandingReport
};
