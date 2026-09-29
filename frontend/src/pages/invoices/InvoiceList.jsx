import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { invoiceService } from '../../services/invoiceService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import PaymentModal from '../../components/common/PaymentModal';
import { toast } from 'react-toastify';

export default function InvoiceList() {
  const { isAdmin } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Payment Recording Modal
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.getInvoices({
        page,
        limit: 10,
        search,
        status: status || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined
      });
      if (res.success) {
        setInvoices(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, search, status, fromDate, toDate]);

  const handleDelete = async (id, invNumber) => {
    if (!window.confirm(`Are you sure you want to delete invoice ${invNumber}? This will reverse stock changes.`)) return;

    try {
      const res = await invoiceService.deleteInvoice(id);
      if (res.success) {
        toast.success(res.message || 'Invoice deleted.');
        fetchInvoices();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice.');
    }
  };

  const handleRegeneratePdf = async (id) => {
    try {
      const res = await invoiceService.regeneratePdf(id);
      if (res.success) {
        toast.success('PDF refreshed!');
        fetchInvoices();
      }
    } catch (err) {
      toast.error('Failed to regenerate PDF.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">Invoice Management</h4>
          <p className="text-muted small mb-0">Browse, filter, print, record payments, and download official GST Tax Invoices</p>
        </div>
        <Link to="/invoices/new" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <i className="bi bi-file-earmark-plus-fill"></i>
          <span>Create New Invoice</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="dashboard-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control form-control-custom border-start-0 ps-0"
                placeholder="Search invoice no, customer name, GSTIN..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-custom"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="UNPAID">UNPAID</option>
              <option value="PARTIALLY PAID">PARTIALLY PAID</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <input
              type="date"
              className="form-control form-control-custom"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              title="From Date"
            />
          </div>
          <div className="col-6 col-md-3">
            <input
              type="date"
              className="form-control form-control-custom"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              title="To Date"
            />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="dashboard-card p-4">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Taxable Val</th>
                <th>Total GST</th>
                <th>Grand Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                    <span className="ms-2 text-muted">Loading invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-5 text-muted">
                    No invoices found matching current filters.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <Link to={`/invoices/${inv.id}`} className="fw-bold text-primary font-monospace text-decoration-none">
                        {inv.invoice_number}
                      </Link>
                      <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                        {inv.is_inter_state ? 'Inter-State' : 'Intra-State'}
                      </div>
                    </td>
                    <td>
                      <div className="text-dark">{formatDate(inv.invoice_date)}</div>
                      <small className="text-muted">Due: {formatDate(inv.due_date)}</small>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{inv.customer_name}</div>
                      <small className="text-muted">{inv.customer_state} ({inv.customer_state_code})</small>
                    </td>
                    <td>{formatCurrency(inv.taxable_amount)}</td>
                    <td className="text-teal fw-semibold">{formatCurrency(inv.total_tax)}</td>
                    <td className="fw-bold text-dark">{formatCurrency(inv.grand_total)}</td>
                    <td className="text-success fw-semibold">{formatCurrency(inv.paid_amount)}</td>
                    <td className={`fw-bold ${Number(inv.balance_amount) > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatCurrency(inv.balance_amount)}
                    </td>
                    <td>
                      <span className={`badge ${inv.status === 'PAID' ? 'badge-paid' : inv.status === 'PARTIALLY PAID' ? 'badge-partial' : 'badge-unpaid'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      {/* Record Payment Button */}
                      {inv.status !== 'PAID' && (
                        <button
                          className="btn btn-sm btn-teal-custom me-1 py-1 px-2"
                          title="Record Payment & Generate Receipt"
                          onClick={() => setSelectedInvoiceForPayment(inv)}
                        >
                          <i className="bi bi-wallet2 me-1"></i> Pay
                        </button>
                      )}

                      {/* Download PDF */}
                      {inv.pdf_path && (
                        <a
                          href={inv.pdf_path}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-light border me-1"
                          title="Download Invoice PDF"
                        >
                          <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                        </a>
                      )}

                      {/* View Detail */}
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="btn btn-sm btn-light border me-1"
                        title="View Full Breakdown"
                      >
                        <i className="bi bi-eye text-primary"></i>
                      </Link>

                      {/* Admin Delete */}
                      {isAdmin && (
                        <button
                          className="btn btn-sm btn-light border text-danger"
                          title="Delete Invoice"
                          onClick={() => handleDelete(inv.id, inv.invoice_number)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Record Payment Modal */}
      {selectedInvoiceForPayment && (
        <PaymentModal
          show={!!selectedInvoiceForPayment}
          invoice={selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onSuccess={fetchInvoices}
        />
      )}
    </div>
  );
}
