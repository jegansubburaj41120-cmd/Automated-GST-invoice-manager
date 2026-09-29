import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { receiptService } from '../../services/receiptService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Pagination from '../../components/common/Pagination';
import ReceiptViewModal from '../../components/common/ReceiptViewModal';
import { toast } from 'react-toastify';

export default function ReceiptList() {
  const [receipts, setReceipts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Modal preview state
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const res = await receiptService.getReceipts({
        page,
        limit: 10,
        search,
        payment_method: paymentMethod || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined
      });
      if (res.success) {
        setReceipts(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load receipts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [page, search, paymentMethod, fromDate, toDate]);

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">Payment Receipt Management</h4>
          <p className="text-muted small mb-0">Official verified receipts generated for GST tax invoice payments with QR codes</p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/invoices" className="btn btn-primary-custom d-flex align-items-center gap-2">
            <i className="bi bi-wallet2"></i>
            <span>Record Payment from Invoice</span>
          </Link>
        </div>
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
                placeholder="Search receipt no, invoice no, customer, UTR..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-custom"
              value={paymentMethod}
              onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
            >
              <option value="">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
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

      {/* Receipts Table */}
      <div className="dashboard-card p-4">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Payment Date</th>
                <th>Invoice Number</th>
                <th>Customer</th>
                <th>Amount Received</th>
                <th>Payment Method</th>
                <th>Transaction Ref</th>
                <th>Invoice Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="spinner-border text-teal spinner-border-sm" role="status"></div>
                    <span className="ms-2 text-muted">Loading payment receipts...</span>
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    No payment receipts found matching current filters.
                  </td>
                </tr>
              ) : (
                receipts.map((rec) => (
                  <tr key={rec.id}>
                    <td>
                      <span
                        className="fw-bold text-teal font-monospace role-button"
                        onClick={() => setSelectedReceiptId(rec.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        {rec.receipt_number}
                      </span>
                    </td>
                    <td>{formatDate(rec.receipt_date)}</td>
                    <td>
                      <Link to={`/invoices/${rec.invoice_id}`} className="font-monospace text-primary fw-semibold text-decoration-none">
                        {rec.invoice_number}
                      </Link>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{rec.customer_name}</div>
                      <small className="text-muted">{rec.customer_phone}</small>
                    </td>
                    <td className="fw-bold text-success fs-7">
                      {formatCurrency(rec.amount)}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border px-2 py-1">
                        {rec.payment_method}
                      </span>
                    </td>
                    <td>
                      <span className="font-monospace text-muted small">
                        {rec.transaction_reference || '---'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${rec.invoice_status === 'PAID' ? 'badge-paid' : 'badge-partial'}`}>
                        {rec.invoice_status}
                      </span>
                    </td>
                    <td className="text-end text-nowrap">
                      {/* View Receipt Modal */}
                      <button
                        className="btn btn-sm btn-outline-teal me-1 py-1 px-2"
                        title="View Receipt Preview with QR"
                        onClick={() => setSelectedReceiptId(rec.id)}
                      >
                        <i className="bi bi-eye"></i> View
                      </button>

                      {/* Download PDF */}
                      {rec.pdf_path && (
                        <a
                          href={rec.pdf_path}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-light border py-1 px-2 me-1"
                          title="Download Receipt PDF"
                        >
                          <i className="bi bi-file-earmark-pdf-fill text-danger"></i> PDF
                        </a>
                      )}

                      {/* View Linked Invoice */}
                      <Link
                        to={`/invoices/${rec.invoice_id}`}
                        className="btn btn-sm btn-light border py-1 px-2"
                        title="Go to Original Invoice"
                      >
                        <i className="bi bi-arrow-right-circle text-primary"></i>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* Receipt Modal Preview */}
      {selectedReceiptId && (
        <ReceiptViewModal
          show={!!selectedReceiptId}
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
        />
      )}
    </div>
  );
}
