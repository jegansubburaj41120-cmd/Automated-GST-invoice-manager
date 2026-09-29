import React, { useState, useEffect } from 'react';
import { productService } from '../../services/productService';
import { formatCurrency } from '../../utils/formatters';
import Pagination from '../../components/common/Pagination';
import { toast } from 'react-toastify';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const initialForm = {
    name: '',
    sku: '',
    hsn_code: '',
    category: 'General',
    unit: 'NOS',
    selling_price: '',
    gst_rate: 18.00,
    stock_quantity: 0,
    low_stock_threshold: 5,
    description: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productService.getProducts({
        page,
        limit: 10,
        search,
        category: category || undefined,
        low_stock: lowStockFilter ? 'true' : undefined
      });
      if (res.success) {
        setProducts(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search, category, lowStockFilter]);

  const handleOpenCreate = () => {
    setEditingProduct(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (prod) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name || '',
      sku: prod.sku || '',
      hsn_code: prod.hsn_code || '',
      category: prod.category || 'General',
      unit: prod.unit || 'NOS',
      selling_price: prod.selling_price || '',
      gst_rate: prod.gst_rate || 18.00,
      stock_quantity: prod.stock_quantity || 0,
      low_stock_threshold: prod.low_stock_threshold || 5,
      description: prod.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.hsn_code || formData.selling_price === '') {
      toast.warning('Please fill in product name, HSN code, and selling price.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, formData);
        toast.success('Product updated successfully!');
      } else {
        await productService.createProduct(formData);
        toast.success('Product added to catalog!');
      }
      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving product.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete / archive "${name}"?`)) return;

    try {
      const res = await productService.deleteProduct(id);
      if (res.success) {
        toast.success(res.message || 'Product removed.');
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete product.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">Products & Services Catalog</h4>
          <p className="text-muted small mb-0">Manage inventory, HSN codes, default GST tax rates, and stock alerts</p>
        </div>
        <button className="btn btn-primary-custom d-flex align-items-center gap-2" onClick={handleOpenCreate}>
          <i className="bi bi-plus-circle-fill"></i>
          <span>Add New Product / Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="dashboard-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control form-control-custom border-start-0 ps-0"
                placeholder="Search by product name, SKU, HSN code..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-4">
            <select
              className="form-select form-select-custom"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            >
              <option value="">All Categories</option>
              <option value="Hardware">Hardware</option>
              <option value="Software">Software</option>
              <option value="Services">Services</option>
              <option value="Accessories">Accessories</option>
              <option value="Furniture">Furniture</option>
              <option value="Stationery">Stationery</option>
              <option value="General">General</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <div className="form-check form-switch pt-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="lowStockCheck"
                checked={lowStockFilter}
                onChange={(e) => { setLowStockFilter(e.target.checked); setPage(1); }}
              />
              <label className="form-check-label small fw-semibold text-danger" htmlFor="lowStockCheck">
                <i className="bi bi-exclamation-triangle-fill me-1"></i> Low Stock Only
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="dashboard-card p-4">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Product / Service</th>
                <th>HSN / SAC</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Price (Excl. Tax)</th>
                <th>GST Rate</th>
                <th>Stock Quantity</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                    <span className="ms-2 text-muted">Loading product catalog...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No products found matching the criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = Number(p.stock_quantity) <= Number(p.low_stock_threshold);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="fw-bold text-dark">{p.name}</div>
                        <small className="text-muted font-monospace">{p.sku || 'No SKU'}</small>
                      </td>
                      <td>
                        <span className="badge bg-light text-secondary font-monospace border px-2 py-1">
                          {p.hsn_code}
                        </span>
                      </td>
                      <td><span className="text-secondary">{p.category || 'General'}</span></td>
                      <td><span className="fw-semibold">{p.unit}</span></td>
                      <td className="fw-bold text-dark">{formatCurrency(p.selling_price)}</td>
                      <td>
                        <span className={`badge ${p.gst_rate === 18 ? 'bg-primary-subtle text-primary' : p.gst_rate === 28 ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success'} px-2 py-1`}>
                          {p.gst_rate}% GST
                        </span>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <span className={`fw-bold ${isLow ? 'text-danger' : 'text-success'}`}>
                            {p.stock_quantity} {p.unit}
                          </span>
                          {isLow && (
                            <span className="badge bg-danger text-white" style={{ fontSize: '0.65rem' }}>
                              LOW
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-end text-nowrap">
                        <button
                          className="btn btn-sm btn-light border me-1"
                          title="Edit Product"
                          onClick={() => handleOpenEdit(p)}
                        >
                          <i className="bi bi-pencil-square text-secondary"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-light border text-danger"
                          title="Delete Product"
                          onClick={() => handleDelete(p.id, p.name)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Product Form Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white p-3 px-4">
                <h5 className="modal-title fw-bold fs-6">
                  <i className={`bi ${editingProduct ? 'bi-pencil-square' : 'bi-box-seam-fill'} text-primary me-2`}></i>
                  {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add Product to Catalog'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-8">
                      <label className="form-label fw-semibold fs-7">Product / Service Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="e.g. Dell Latitude Laptop i7"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold fs-7">SKU / Item Code</label>
                      <input
                        type="text"
                        className="form-control form-control-custom font-monospace text-uppercase"
                        placeholder="LAP-DELL-01"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold fs-7">HSN / SAC Code <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom font-monospace"
                        placeholder="84713010 or 998314"
                        value={formData.hsn_code}
                        onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold fs-7">Category</label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="Hardware / Software / Services"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold fs-7">Unit of Measure</label>
                      <select
                        className="form-select form-select-custom"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      >
                        <option value="NOS">NOS (Numbers / Units)</option>
                        <option value="PCS">PCS (Pieces)</option>
                        <option value="BOX">BOX (Boxes)</option>
                        <option value="SET">SET (Sets)</option>
                        <option value="PAC">PAC (Packages)</option>
                        <option value="HRS">HRS (Hours - Services)</option>
                        <option value="KG">KG (Kilograms)</option>
                        <option value="MTR">MTR (Meters)</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold fs-7">Selling Price (Excl. GST) <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text bg-white">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control form-control-custom fw-bold"
                          placeholder="0.00"
                          value={formData.selling_price}
                          onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label fw-semibold fs-7">GST Tax Rate <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-select-custom fw-bold text-primary"
                        value={formData.gst_rate}
                        onChange={(e) => setFormData({ ...formData, gst_rate: parseFloat(e.target.value) })}
                      >
                        <option value="0">0% (Nil / Exempted)</option>
                        <option value="5">5% (Essential Commodities)</option>
                        <option value="12">12% (Standard Lower)</option>
                        <option value="18">18% (Standard Standard / IT Services)</option>
                        <option value="28">28% (Luxury / Higher)</option>
                      </select>
                    </div>

                    <div className="col-md-2">
                      <label className="form-label fw-semibold fs-7">Stock Qty</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control form-control-custom"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>

                    <div className="col-md-2">
                      <label className="form-label fw-semibold fs-7">Low Alert At</label>
                      <input
                        type="number"
                        min="0"
                        className="form-control form-control-custom"
                        value={formData.low_stock_threshold}
                        onChange={(e) => setFormData({ ...formData, low_stock_threshold: parseInt(e.target.value, 10) || 0 })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold fs-7">Description</label>
                      <textarea
                        className="form-control form-control-custom"
                        rows="2"
                        placeholder="Detailed product specifications or service description..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-secondary px-3" onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-custom px-4" disabled={submitting}>
                    {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Add to Catalog'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
