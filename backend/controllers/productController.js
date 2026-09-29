const { query } = require('../config/db');
const { logAudit } = require('../middleware/auditLogger');

/**
 * Get all products with search, pagination, category & stock filters
 */
async function getProducts(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search.trim()}%` : null;
    const category = req.query.category || null;
    const lowStock = req.query.low_stock === 'true';

    let whereConditions = ['is_active = 1'];
    let params = [];

    if (search) {
      whereConditions.push('(name LIKE ? OR sku LIKE ? OR hsn_code LIKE ? OR category LIKE ?)');
      params.push(search, search, search, search);
    }

    if (category) {
      whereConditions.push('category = ?');
      params.push(category);
    }

    if (lowStock) {
      whereConditions.push('stock_quantity <= low_stock_threshold');
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Total count
    const countResult = await query(`SELECT COUNT(*) as total FROM products ${whereClause}`, params);
    const total = countResult[0].total;

    // Fetch records
    const sql = `
      SELECT p.*,
        (SELECT COALESCE(SUM(quantity), 0) FROM invoice_items WHERE product_id = p.id) as total_units_sold,
        (SELECT COALESCE(SUM(line_total), 0) FROM invoice_items WHERE product_id = p.id) as total_revenue
      FROM products p
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const products = await query(sql, [...params, limit, offset]);

    res.json({
      success: true,
      data: products,
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
 * Get simple product list for invoice item selection
 */
async function getAllProductsSimple(req, res, next) {
  try {
    const products = await query(
      'SELECT id, name, sku, hsn_code, unit, selling_price, gst_rate, stock_quantity, category FROM products WHERE is_active = 1 ORDER BY name ASC'
    );
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single product by ID
 */
async function getProductById(req, res, next) {
  try {
    const productId = req.params.id;
    const products = await query('SELECT * FROM products WHERE id = ?', [productId]);

    if (!products || products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const product = products[0];

    // Sales history
    const salesHistory = await query(
      `SELECT ii.quantity, ii.unit_price, ii.taxable_value, ii.line_total, i.invoice_number, i.invoice_date, c.name as customer_name
       FROM invoice_items ii
       JOIN invoices i ON i.id = ii.invoice_id
       JOIN customers c ON c.id = i.customer_id
       WHERE ii.product_id = ?
       ORDER BY i.invoice_date DESC
       LIMIT 10`,
      [productId]
    );

    res.json({
      success: true,
      data: {
        product,
        salesHistory
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create product
 */
async function createProduct(req, res, next) {
  try {
    const {
      name, sku, hsn_code, category, unit, selling_price,
      gst_rate, stock_quantity, low_stock_threshold, description, image_url
    } = req.body;

    const generatedSku = sku ? sku.trim().toUpperCase() : `SKU-${Date.now().toString().slice(-6)}`;

    const result = await query(
      `INSERT INTO products 
       (name, sku, hsn_code, category, unit, selling_price, gst_rate, stock_quantity, low_stock_threshold, description, image_url, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        name.trim(),
        generatedSku,
        hsn_code.trim(),
        category ? category.trim() : 'General',
        unit ? unit.trim().toUpperCase() : 'NOS',
        parseFloat(selling_price) || 0,
        parseFloat(gst_rate) || 18,
        parseInt(stock_quantity, 10) || 0,
        parseInt(low_stock_threshold, 10) || 5,
        description ? description.trim() : null,
        image_url ? image_url.trim() : null,
        req.user.id
      ]
    );

    await logAudit(req.user, 'CREATE_PRODUCT', 'PRODUCTS', result.insertId, `Created product: ${name}`, req.ip);

    res.status(201).json({
      success: true,
      message: 'Product added successfully.',
      productId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update product
 */
async function updateProduct(req, res, next) {
  try {
    const productId = req.params.id;
    const {
      name, sku, hsn_code, category, unit, selling_price,
      gst_rate, stock_quantity, low_stock_threshold, description, image_url, is_active
    } = req.body;

    await query(
      `UPDATE products SET
        name = ?, sku = ?, hsn_code = ?, category = ?, unit = ?, selling_price = ?,
        gst_rate = ?, stock_quantity = ?, low_stock_threshold = ?, description = ?,
        image_url = ?, is_active = ?
       WHERE id = ?`,
      [
        name.trim(),
        sku ? sku.trim().toUpperCase() : null,
        hsn_code.trim(),
        category ? category.trim() : 'General',
        unit ? unit.trim().toUpperCase() : 'NOS',
        parseFloat(selling_price) || 0,
        parseFloat(gst_rate) || 18,
        parseInt(stock_quantity, 10) || 0,
        parseInt(low_stock_threshold, 10) || 5,
        description ? description.trim() : null,
        image_url ? image_url.trim() : null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        productId
      ]
    );

    await logAudit(req.user, 'UPDATE_PRODUCT', 'PRODUCTS', productId, `Updated product: ${name}`, req.ip);

    res.json({
      success: true,
      message: 'Product updated successfully.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete product (Soft delete or delete)
 */
async function deleteProduct(req, res, next) {
  try {
    const productId = req.params.id;

    // Check if product is in invoice_items
    const items = await query('SELECT id FROM invoice_items WHERE product_id = ? LIMIT 1', [productId]);
    if (items && items.length > 0) {
      // Soft delete
      await query('UPDATE products SET is_active = 0 WHERE id = ?', [productId]);
      await logAudit(req.user, 'ARCHIVE_PRODUCT', 'PRODUCTS', productId, `Archived product ID: ${productId} (linked to past invoices)`, req.ip);
      return res.json({
        success: true,
        message: 'Product archived successfully (retained for historical invoice records).'
      });
    }

    await query('DELETE FROM products WHERE id = ?', [productId]);
    await logAudit(req.user, 'DELETE_PRODUCT', 'PRODUCTS', productId, `Deleted product ID: ${productId}`, req.ip);

    res.json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getAllProductsSimple,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
