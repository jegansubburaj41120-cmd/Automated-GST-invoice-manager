import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Pagination from '../../components/common/Pagination';
import ReceiptViewModal from '../../components/common/ReceiptViewModal';
import { toast } from 'react-toastify';

export default function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await paymentService.getPayments({
        page,
        limit: 10,
        payment_method: method || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined
      });
      if (res.success) {
        setPayments(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load payment records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, method, fromDate, toDate]);

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">Payment Transactions History</h4>
          <p className="text-muted small mb-0">Audit trail of all incoming payments, payment channels, and receipt links</p>
        </div>
        <Link to="/invoices" className="btn btn-primary-custom d-flex align-items-center gap-2">
          <i className="bi bi-wallet2"></i>
          <span>Record New Payment</span>
        </Link>
      </div>

      {/* Filter */}
      <div className="dashboard-card p-3 mb-4">
        <div className="row g-3 align-items-center">
          <div className="col-12 col-md-4">
            <select
              className="form-select form-select-custom"
              value={method}
              onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            >
              <option value="">All Payment Methods</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Cheque">Cheque</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="col-6 col-md-4">
            <input
              type="date"
              className="form-control form-control-custom"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              title="From Date"
            />
          </div>
          <div className="col-6 col-md-4">
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

      {/* Payments Table */}
      <div className="dashboard-card p-4">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Invoice Ref</th>
                <th>Customer</th>
                <th>Amount Paid</th>
                <th>Payment Method</th>
                <th>Transaction / UTR</th>
                <th>Receipt Generated</th>
                <th>Recorded By</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                    <span className="ms-2 text-muted">Loading payments...</span>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-5 text-muted">
                    No payment transactions found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td>{formatDate(p.payment_date)}</td>
                    <td>
                      <Link to={`/invoices/${p.invoice_id}`} className="font-monospace fw-bold text-primary text-decoration-none">
                        {p.invoice_number}
                      </Link>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{p.customer_name}</div>
                      <small className="text-muted">{p.customer_phone}</small>
                    </td>
                    <td className="fw-bold text-success fs-7">
                      {formatCurrency(p.amount)}
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">
                        {p.payment_method}
                      </span>
                    </td>
                    <td>
                      <span className="font-monospace text-muted small">{p.transaction_reference || 'N/A'}</span>
                    </td>
                    <td>
                      {p.receipt_number ? (
                        <span
                          className="fw-bold text-teal font-monospace"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelectedReceiptId(p.receipt_id)}
                        >
                          {p.receipt_number}
                        </span>
                      ) : (
                        <span className="text-muted small">None</span>
                      )}
                    </td>
                    <td>
                      <small className="text-secondary">{p.recorded_by_name || 'System'}</small>
                    </td>
                    <td className="text-end text-nowrap">
                      {p.receipt_id && (
                        <button
                          className="btn btn-sm btn-outline-teal py-1 px-2 me-1"
                          title="View Receipt"
                          onClick={() => setSelectedReceiptId(p.receipt_id)}
                        >
                          <i className="bi bi-receipt"></i>
                        </button>
                      )}
                      {p.receipt_pdf && (
                        <a
                          href={p.receipt_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-light border py-1 px-2"
                          title="Download Receipt PDF"
                        >
                          <i className="bi bi-file-earmark-pdf-fill text-danger"></i>
                        </a>
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

      {/* Receipt Modal */}
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
