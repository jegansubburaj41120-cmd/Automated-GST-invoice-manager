import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { invoiceService } from '../../services/invoiceService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import PaymentModal from '../../components/common/PaymentModal';
import ReceiptViewModal from '../../components/common/ReceiptViewModal';
import { toast } from 'react-toastify';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment & Receipt Modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);

  const fetchInvoiceDetail = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.getInvoiceById(id);
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  if (!data || !data.invoice) {
    return (
      <div className="text-center py-5">
        <h4 className="text-danger">Invoice not found</h4>
        <button className="btn btn-primary-custom mt-3" onClick={() => navigate('/invoices')}>
          Back to Invoices
        </button>
      </div>
    );
  }

  const { invoice, items, payments, settings } = data;
  const isInterState = Boolean(invoice.is_inter_state);

  return (
    <div>
      {/* Top Action Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <h4 className="fw-bold text-dark brand-font mb-0">Tax Invoice: {invoice.invoice_number}</h4>
            <span className={`badge ${invoice.status === 'PAID' ? 'badge-paid' : invoice.status === 'PARTIALLY PAID' ? 'badge-partial' : 'badge-unpaid'} fs-7`}>
              {invoice.status}
            </span>
          </div>
          <p className="text-muted small mb-0">Issued on {formatDate(invoice.invoice_date)} • Due on {formatDate(invoice.due_date)}</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          {invoice.status !== 'PAID' && (
            <button className="btn btn-teal-custom d-flex align-items-center gap-2" onClick={() => setShowPaymentModal(true)}>
              <i className="bi bi-wallet2"></i>
              <span>Record Payment & Receipt</span>
            </button>
          )}

          {invoice.pdf_path && (
            <a href={invoice.pdf_path} target="_blank" rel="noreferrer" className="btn btn-outline-danger d-flex align-items-center gap-2">
              <i className="bi bi-file-earmark-pdf-fill"></i>
              <span>Download PDF</span>
            </a>
          )}

          <button className="btn btn-light border" onClick={() => window.print()}>
            <i className="bi bi-printer me-1"></i> Print
          </button>
          <button className="btn btn-light border" onClick={() => navigate('/invoices')}>
            <i className="bi bi-arrow-left"></i>
          </button>
        </div>
      </div>

      {/* Invoice Details Layout */}
      <div className="row g-4 mb-4">
        {/* Customer & Company Details */}
        <div className="col-12 col-md-6">
          <div className="dashboard-card p-4 h-100">
            <h6 className="fw-bold text-muted text-uppercase fs-7 mb-3">Billed To (Customer)</h6>
            <h5 className="fw-bold text-dark mb-1">{invoice.customer_name}</h5>
            <p className="text-muted small mb-2">
              {invoice.customer_billing_address}, {invoice.customer_city} - {invoice.customer_pincode}
            </p>
            <div className="small mb-1"><strong>Phone:</strong> {invoice.customer_phone}</div>
            <div className="small mb-1"><strong>Email:</strong> {invoice.customer_email || 'N/A'}</div>
            <div className="small mb-1">
              <strong>GSTIN:</strong> <span className="font-monospace text-primary fw-semibold">{invoice.customer_gstin || 'Unregistered'}</span>
            </div>
            <div className="small"><strong>State:</strong> {invoice.customer_state} (Code: {invoice.customer_state_code})</div>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="dashboard-card p-4 h-100">
            <h6 className="fw-bold text-muted text-uppercase fs-7 mb-3">Supply & Payment Terms</h6>
            <div className="row g-2 small">
              <div className="col-6"><strong>Place of Supply:</strong></div>
              <div className="col-6 text-end">{invoice.place_of_supply} ({invoice.place_of_supply_code})</div>

              <div className="col-6"><strong>Supply Nature:</strong></div>
              <div className="col-6 text-end">
                <span className="badge bg-light text-dark border">
                  {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                </span>
              </div>

              <div className="col-6"><strong>Payment Terms:</strong></div>
              <div className="col-6 text-end">{invoice.payment_terms || 'Due on Receipt'}</div>

              <div className="col-6"><strong>Grand Total:</strong></div>
              <div className="col-6 text-end fw-bold text-dark">{formatCurrency(invoice.grand_total)}</div>

              <div className="col-6"><strong>Amount Paid:</strong></div>
              <div className="col-6 text-end fw-bold text-success">{formatCurrency(invoice.paid_amount)}</div>

              <div className="col-6"><strong>Remaining Balance:</strong></div>
              <div className={`col-6 text-end fw-bold ${Number(invoice.balance_amount) > 0 ? 'text-danger' : 'text-success'}`}>
                {formatCurrency(invoice.balance_amount)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="dashboard-card p-4 mb-4">
        <h6 className="fw-bold text-dark brand-font mb-3">Itemized Tax Breakdown</h6>
        <div className="table-responsive">
          <table className="custom-table table-sm">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Description</th>
                <th>HSN/SAC</th>
                <th>Qty</th>
                <th>Unit Rate</th>
                <th>Discount</th>
                <th>Taxable Val</th>
                {isInterState ? (
                  <th>IGST</th>
                ) : (
                  <>
                    <th>CGST</th>
                    <th>SGST</th>
                  </>
                )}
                <th className="text-end">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td>{idx + 1}</td>
                  <td className="fw-semibold text-dark">{item.product_name}</td>
                  <td className="font-monospace text-muted">{item.hsn_code}</td>
                  <td>{item.quantity} {item.unit}</td>
                  <td>{formatCurrency(item.unit_price)}</td>
                  <td>{formatCurrency(item.discount_amount)} ({item.discount_percent}%)</td>
                  <td className="fw-semibold">{formatCurrency(item.taxable_value)}</td>
                  {isInterState ? (
                    <td>
                      <small className="text-muted">{item.igst_rate}%</small>
                      <div>{formatCurrency(item.igst_amount)}</div>
                    </td>
                  ) : (
                    <>
                      <td>
                        <small className="text-muted">{item.cgst_rate}%</small>
                        <div>{formatCurrency(item.cgst_amount)}</div>
                      </td>
                      <td>
                        <small className="text-muted">{item.sgst_rate}%</small>
                        <div>{formatCurrency(item.sgst_amount)}</div>
                      </td>
                    </>
                  )}
                  <td className="text-end fw-bold text-dark">{formatCurrency(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary Rows */}
        <div className="row justify-content-end mt-4">
          <div className="col-12 col-md-5">
            <div className="p-3 bg-light rounded-3 border">
              <div className="d-flex justify-content-between mb-2 small">
                <span>Subtotal:</span>
                <span className="fw-semibold">{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 small">
                <span>Total Discount:</span>
                <span className="text-danger">- {formatCurrency(invoice.discount_amount)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 small fw-bold pt-2 border-top">
                <span>Taxable Amount:</span>
                <span>{formatCurrency(invoice.taxable_amount)}</span>
              </div>
              {isInterState ? (
                <div className="d-flex justify-content-between mb-2 small text-secondary">
                  <span>IGST Total:</span>
                  <span>{formatCurrency(invoice.igst_amount)}</span>
                </div>
              ) : (
                <>
                  <div className="d-flex justify-content-between mb-1 small text-secondary">
                    <span>CGST Total:</span>
                    <span>{formatCurrency(invoice.cgst_amount)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 small text-secondary">
                    <span>SGST Total:</span>
                    <span>{formatCurrency(invoice.sgst_amount)}</span>
                  </div>
                </>
              )}
              <div className="d-flex justify-content-between mb-2 small">
                <span>Round Off:</span>
                <span>{invoice.round_off >= 0 ? '+' : ''}{formatCurrency(invoice.round_off)}</span>
              </div>
              <div className="d-flex justify-content-between pt-2 border-top fs-6 fw-bold text-primary">
                <span>Grand Total:</span>
                <span>{formatCurrency(invoice.grand_total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Receipts History linked to this invoice */}
      <div className="dashboard-card p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold text-dark brand-font mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-receipt text-teal"></i> Payment Receipts Generated for this Invoice
          </h6>
          {invoice.status !== 'PAID' && (
            <button className="btn btn-sm btn-teal-custom" onClick={() => setShowPaymentModal(true)}>
              <i className="bi bi-plus-lg me-1"></i> Record Payment
            </button>
          )}
        </div>

        <div className="table-responsive">
          <table className="custom-table table-sm">
            <thead>
              <tr>
                <th>Receipt No</th>
                <th>Payment Date</th>
                <th>Amount Paid</th>
                <th>Method</th>
                <th>Transaction Ref</th>
                <th>Recorded By</th>
                <th className="text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="fw-bold text-teal font-monospace">{p.receipt_number || '---'}</td>
                  <td>{formatDate(p.payment_date)}</td>
                  <td className="fw-bold text-success">{formatCurrency(p.amount)}</td>
                  <td><span className="badge bg-light text-dark border">{p.payment_method}</span></td>
                  <td className="font-monospace text-muted">{p.transaction_reference || 'N/A'}</td>
                  <td>{p.recorded_by || 'Staff'}</td>
                  <td className="text-end text-nowrap">
                    {p.receipt_id && (
                      <button
                        className="btn btn-sm btn-outline-teal py-1 px-2 me-1"
                        onClick={() => setSelectedReceiptId(p.receipt_id)}
                      >
                        <i className="bi bi-eye"></i> View Receipt
                      </button>
                    )}
                    {p.receipt_pdf && (
                      <a href={p.receipt_pdf} target="_blank" rel="noreferrer" className="btn btn-sm btn-light border py-1 px-2">
                        <i className="bi bi-file-earmark-pdf-fill text-danger"></i> PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    No payments recorded yet for this invoice. Click "Record Payment" to accept payment and issue a receipt.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <PaymentModal
          show={showPaymentModal}
          invoice={invoice}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={fetchInvoiceDetail}
        />
      )}

      {/* Receipt Viewer Modal */}
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
