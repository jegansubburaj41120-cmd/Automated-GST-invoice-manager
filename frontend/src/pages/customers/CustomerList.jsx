import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/customerService';
import { INDIAN_STATES, formatCurrency, formatDate } from '../../utils/formatters';
import { isValidGSTIN, isValidPAN } from '../../utils/gstValidators';
import Pagination from '../../components/common/Pagination';
import { toast } from 'react-toastify';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewCustomerData, setViewCustomerData] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    email: '',
    phone: '',
    gstin: '',
    pan: '',
    customer_type: 'registered',
    billing_address: '',
    shipping_address: '',
    city: '',
    state: 'Maharashtra',
    state_code: '27',
    pincode: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers({
        page,
        limit: 10,
        search,
        type: customerType || undefined,
        state: selectedState || undefined
      });
      if (res.success) {
        setCustomers(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search, customerType, selectedState]);

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData(initialForm);
    setShowFormModal(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      gstin: customer.gstin || '',
      pan: customer.pan || '',
      customer_type: customer.customer_type || 'unregistered',
      billing_address: customer.billing_address || '',
      shipping_address: customer.shipping_address || '',
      city: customer.city || '',
      state: customer.state || 'Maharashtra',
      state_code: customer.state_code || '27',
      pincode: customer.pincode || ''
    });
    setShowFormModal(true);
  };

  const handleOpenView = async (customer) => {
    try {
      const res = await customerService.getCustomerById(customer.id);
      if (res.success) {
        setViewCustomerData(res.data);
        setShowViewModal(true);
      }
    } catch (err) {
      toast.error('Failed to load customer profile.');
    }
  };

  const handleStateChange = (e) => {
    const stName = e.target.value;
    const found = INDIAN_STATES.find((s) => s.name === stName);
    setFormData((prev) => ({
      ...prev,
      state: stName,
      state_code: found ? found.code : '00'
    }));
  };

  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase();
    let autoPan = formData.pan;
    let autoType = formData.customer_type;

    if (val.length >= 12) {
      autoPan = val.substring(2, 12);
      autoType = 'registered';
    }

    setFormData((prev) => ({
      ...prev,
      gstin: val,
      pan: autoPan,
      customer_type: autoType
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.gstin && !isValidGSTIN(formData.gstin)) {
      toast.error('Invalid GSTIN format. Must be 15 alphanumeric characters (e.g. 27AAACA1234F1Z5).');
      return;
    }

    if (formData.pan && !isValidPAN(formData.pan)) {
      toast.error('Invalid PAN format (e.g. ABCDE1234F).');
      return;
    }

    try {
      setSubmitting(true);
      if (editingCustomer) {
        await customerService.updateCustomer(editingCustomer.id, formData);
        toast.success('Customer updated successfully!');
      } else {
        await customerService.createCustomer(formData);
        toast.success('Customer added successfully!');
      }
      setShowFormModal(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving customer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    try {
      const res = await customerService.deleteCustomer(id);
      if (res.success) {
        toast.success('Customer deleted successfully.');
        fetchCustomers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">Customer Management</h4>
          <p className="text-muted small mb-0">Manage registered & unregistered clients, GST details, and billing history</p>
        </div>
        <button className="btn btn-primary-custom d-flex align-items-center gap-2" onClick={handleOpenCreate}>
          <i className="bi bi-person-plus-fill"></i>
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="dashboard-card p-3 mb-4">
        <div className="row g-3">
          <div className="col-12 col-md-5">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control form-control-custom border-start-0 ps-0"
                placeholder="Search by customer name, phone, GSTIN, city..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select
              className="form-select form-select-custom"
              value={customerType}
              onChange={(e) => { setCustomerType(e.target.value); setPage(1); }}
            >
              <option value="">All Customer Types</option>
              <option value="registered">Registered (GSTIN)</option>
              <option value="unregistered">Unregistered</option>
            </select>
          </div>
          <div className="col-6 col-md-4">
            <select
              className="form-select form-select-custom"
              value={selectedState}
              onChange={(e) => { setSelectedState(e.target.value); setPage(1); }}
            >
              <option value="">All States</option>
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="dashboard-card p-4">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Contact Info</th>
                <th>GSTIN / PAN</th>
                <th>State & Code</th>
                <th>Type</th>
                <th>Total Billed</th>
                <th>Outstanding</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                    <span className="ms-2 text-muted">Loading customers...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No customers found matching the search criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="fw-bold text-dark">{c.name}</div>
                      <small className="text-muted">{c.city || 'City N/A'}</small>
                    </td>
                    <td>
                      <div><i className="bi bi-telephone text-muted me-1"></i>{c.phone}</div>
                      {c.email && <small className="text-muted"><i className="bi bi-envelope text-muted me-1"></i>{c.email}</small>}
                    </td>
                    <td>
                      {c.gstin ? (
                        <div className="font-monospace fw-semibold text-primary">{c.gstin}</div>
                      ) : (
                        <span className="text-muted small">No GSTIN</span>
                      )}
                      {c.pan && <small className="d-block text-secondary font-monospace">PAN: {c.pan}</small>}
                    </td>
                    <td>
                      <span className="fw-semibold">{c.state}</span>
                      <span className="badge bg-light text-dark border ms-1">{c.state_code}</span>
                    </td>
                    <td>
                      <span className={`badge ${c.customer_type === 'registered' ? 'badge-registered' : 'badge-unregistered'}`}>
                        {c.customer_type}
                      </span>
                    </td>
                    <td className="fw-semibold text-dark">{formatCurrency(c.total_billed)}</td>
                    <td>
                      <span className={`fw-bold ${Number(c.total_outstanding) > 0 ? 'text-danger' : 'text-success'}`}>
                        {formatCurrency(c.total_outstanding)}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        className="btn btn-sm btn-light border me-1"
                        title="View Customer Profile & Ledger"
                        onClick={() => handleOpenView(c)}
                      >
                        <i className="bi bi-eye text-primary"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-light border me-1"
                        title="Edit Customer"
                        onClick={() => handleOpenEdit(c)}
                      >
                        <i className="bi bi-pencil-square text-secondary"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-light border text-danger"
                        title="Delete Customer"
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Customer Form Modal (Add / Edit) */}
      {showFormModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white p-3 px-4">
                <h5 className="modal-title fw-bold fs-6">
                  <i className={`bi ${editingCustomer ? 'bi-pencil-square' : 'bi-person-plus-fill'} text-primary me-2`}></i>
                  {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowFormModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">Customer / Company Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="e.g. Reliance Retail Ltd"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">Phone Number <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">Email Address</label>
                      <input
                        type="email"
                        className="form-control form-control-custom"
                        placeholder="billing@customer.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">Customer Type</label>
                      <select
                        className="form-select form-select-custom"
                        value={formData.customer_type}
                        onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                      >
                        <option value="registered">Registered Business (GST)</option>
                        <option value="unregistered">Unregistered Consumer</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">GSTIN (15 Digits)</label>
                      <input
                        type="text"
                        className="form-control form-control-custom font-monospace"
                        placeholder="27ABCDE1234F1Z5"
                        maxLength="15"
                        value={formData.gstin}
                        onChange={handleGstinChange}
                      />
                      <small className="text-muted">Auto-detects PAN & sets registered</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">PAN Number (10 Digits)</label>
                      <input
                        type="text"
                        className="form-control form-control-custom font-monospace"
                        placeholder="ABCDE1234F"
                        maxLength="10"
                        value={formData.pan}
                        onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">State <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-select-custom"
                        value={formData.state}
                        onChange={handleStateChange}
                        required
                      >
                        {INDIAN_STATES.map((s) => (
                          <option key={s.code} value={s.name}>{s.name} (Code: {s.code})</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">State Code (GST)</label>
                      <input
                        type="text"
                        className="form-control form-control-custom bg-light fw-bold"
                        value={formData.state_code}
                        readOnly
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">City</label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="e.g. Mumbai"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">PIN Code</label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="400001"
                        maxLength="6"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold fs-7">Billing Address <span className="text-danger">*</span></label>
                      <textarea
                        className="form-control form-control-custom"
                        rows="2"
                        placeholder="Full billing street address..."
                        value={formData.billing_address}
                        onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                        required
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-secondary px-3" onClick={() => setShowFormModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-custom px-4" disabled={submitting}>
                    {submitting ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Save Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Customer Detail Modal */}
      {showViewModal && viewCustomerData && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-dark text-white p-3 px-4">
                <h5 className="modal-title fw-bold fs-6">
                  <i className="bi bi-person-lines-fill text-primary me-2"></i>
                  Customer Profile: {viewCustomerData.customer.name}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowViewModal(false)}></button>
              </div>

              <div className="modal-body p-4 bg-light">
                {/* Stats row */}
                <div className="row g-3 mb-4">
                  <div className="col-sm-3">
                    <div className="p-3 bg-white rounded-3 border">
                      <small className="text-muted d-block">Total Invoices</small>
                      <h4 className="fw-bold mb-0 text-primary">{viewCustomerData.stats.totalInvoices}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-white rounded-3 border">
                      <small className="text-muted d-block">Total Billed</small>
                      <h4 className="fw-bold mb-0 text-dark">{formatCurrency(viewCustomerData.stats.totalBilled)}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-white rounded-3 border">
                      <small className="text-muted d-block">Total Paid</small>
                      <h4 className="fw-bold mb-0 text-success">{formatCurrency(viewCustomerData.stats.totalPaid)}</h4>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="p-3 bg-white rounded-3 border">
                      <small className="text-muted d-block">Outstanding Balance</small>
                      <h4 className="fw-bold mb-0 text-danger">{formatCurrency(viewCustomerData.stats.outstandingBalance)}</h4>
                    </div>
                  </div>
                </div>

                {/* Customer Info Card */}
                <div className="bg-white p-3 rounded-3 border mb-4">
                  <div className="row g-2 small">
                    <div className="col-sm-4"><strong>Phone:</strong> {viewCustomerData.customer.phone}</div>
                    <div className="col-sm-4"><strong>Email:</strong> {viewCustomerData.customer.email || 'N/A'}</div>
                    <div className="col-sm-4"><strong>GSTIN:</strong> {viewCustomerData.customer.gstin || 'Unregistered'}</div>
                    <div className="col-sm-8"><strong>Address:</strong> {viewCustomerData.customer.billing_address}, {viewCustomerData.customer.city} - {viewCustomerData.customer.pincode}</div>
                    <div className="col-sm-4"><strong>State:</strong> {viewCustomerData.customer.state} ({viewCustomerData.customer.state_code})</div>
                  </div>
                </div>

                {/* Invoices List */}
                <h6 className="fw-bold text-dark mb-2">Invoice History</h6>
                <div className="table-responsive bg-white rounded-3 border mb-4">
                  <table className="custom-table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Invoice No</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewCustomerData.invoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="fw-bold text-primary font-monospace">{inv.invoice_number}</td>
                          <td>{formatDate(inv.invoice_date)}</td>
                          <td>{formatCurrency(inv.grand_total)}</td>
                          <td className="text-success">{formatCurrency(inv.paid_amount)}</td>
                          <td className="text-danger fw-bold">{formatCurrency(inv.balance_amount)}</td>
                          <td>
                            <span className={`badge ${inv.status === 'PAID' ? 'badge-paid' : inv.status === 'PARTIALLY PAID' ? 'badge-partial' : 'badge-unpaid'}`}>
                              {inv.status}
                            </span>
                          </td>
                          <td>
                            {inv.pdf_path && (
                              <a href={inv.pdf_path} target="_blank" rel="noreferrer" className="btn btn-xs btn-light border py-1 px-2" style={{ fontSize: '0.75rem' }}>
                                <i className="bi bi-file-pdf text-danger"></i> PDF
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                      {viewCustomerData.invoices.length === 0 && (
                        <tr><td colSpan="7" className="text-center py-3 text-muted">No invoice records found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Payments & Receipts History */}
                <h6 className="fw-bold text-dark mb-2">Payment & Receipt History</h6>
                <div className="table-responsive bg-white rounded-3 border">
                  <table className="custom-table table-sm mb-0">
                    <thead>
                      <tr>
                        <th>Receipt No</th>
                        <th>Invoice Ref</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Transaction Ref</th>
                        <th>Receipt PDF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewCustomerData.payments.map((p) => (
                        <tr key={p.id}>
                          <td className="fw-bold text-teal font-monospace">{p.receipt_number || '---'}</td>
                          <td className="font-monospace">{p.invoice_number}</td>
                          <td>{formatDate(p.payment_date)}</td>
                          <td className="fw-bold text-success">{formatCurrency(p.amount)}</td>
                          <td><span className="badge bg-light text-dark border">{p.payment_method}</span></td>
                          <td>{p.transaction_reference || 'N/A'}</td>
                          <td>
                            {p.receipt_pdf && (
                              <a href={p.receipt_pdf} target="_blank" rel="noreferrer" className="btn btn-xs btn-outline-teal py-1 px-2" style={{ fontSize: '0.75rem' }}>
                                <i className="bi bi-receipt"></i> Receipt
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                      {viewCustomerData.payments.length === 0 && (
                        <tr><td colSpan="7" className="text-center py-3 text-muted">No payments recorded yet.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="modal-footer bg-white p-3">
                <button type="button" className="btn btn-secondary px-4" onClick={() => setShowViewModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
