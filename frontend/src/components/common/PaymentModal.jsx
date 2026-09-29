import React, { useState, useEffect } from 'react';
import { paymentService } from '../../services/paymentService';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-toastify';

export default function PaymentModal({ show, onClose, invoice, onSuccess, onOpenReceipt }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  useEffect(() => {
    if (invoice) {
      setAmount(Number(invoice.balance_amount || 0).toFixed(2));
      setPaymentMethod('UPI');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setTransactionRef('');
      setNotes('');
      setPaymentSuccessData(null);
    }
  }, [invoice, show]);

  if (!show || !invoice) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payAmt = parseFloat(amount);
    const balance = parseFloat(invoice.balance_amount);

    if (isNaN(payAmt) || payAmt <= 0) {
      toast.error('Please enter a valid payment amount greater than zero.');
      return;
    }

    if (payAmt > balance + 0.01) {
      toast.error(`Payment amount (${formatCurrency(payAmt)}) cannot exceed outstanding balance (${formatCurrency(balance)}).`);
      return;
    }

    try {
      setSubmitting(true);
      const res = await paymentService.recordPayment({
        invoice_id: invoice.id,
        amount: payAmt,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        transaction_reference: transactionRef,
        notes
      });

      if (res.success) {
        toast.success(res.message || 'Payment recorded and Receipt generated!');
        setPaymentSuccessData(res);
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceiptPdf = () => {
    if (paymentSuccessData?.receiptPdfUrl) {
      window.open(paymentSuccessData.receiptPdfUrl, '_blank');
    }
  };

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div className="modal-header bg-dark text-white p-3 px-4">
            <h5 className="modal-title fw-bold fs-6 d-flex align-items-center gap-2">
              <i className="bi bi-wallet2 text-warning"></i>
              {paymentSuccessData ? 'Payment Receipt Ready' : `Record Payment for ${invoice.invoice_number}`}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            {paymentSuccessData ? (
              <div className="text-center py-3">
                <div className="mb-3 d-inline-flex align-items-center justify-content-center bg-success-subtle text-success rounded-circle" style={{ width: '64px', height: '64px' }}>
                  <i className="bi bi-check2-circle fs-1"></i>
                </div>
                <h5 className="fw-bold text-dark">Payment Recorded Successfully!</h5>
                <p className="text-muted mb-3">
                  Receipt Number: <span className="fw-bold text-primary">{paymentSuccessData.receiptNumber}</span>
                </p>

                <div className="p-3 bg-light rounded-3 mb-4 text-start">
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Invoice No:</span>
                    <span className="fw-semibold">{invoice.invoice_number}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Amount Paid:</span>
                    <span className="fw-bold text-success">{formatCurrency(amount)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Updated Balance:</span>
                    <span className="fw-bold text-dark">{formatCurrency(paymentSuccessData.newBalance)}</span>
                  </div>
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-teal-custom py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm"
                    onClick={handleDownloadReceiptPdf}
                  >
                    <i className="bi bi-file-earmark-pdf-fill fs-5"></i>
                    Download Payment Receipt PDF
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Summary Info Header */}
                <div className="p-3 bg-light rounded-3 mb-3 border">
                  <div className="row g-2">
                    <div className="col-6">
                      <small className="text-muted d-block">Customer</small>
                      <span className="fw-bold text-dark">{invoice.customer_name}</span>
                    </div>
                    <div className="col-6 text-end">
                      <small className="text-muted d-block">Invoice Total</small>
                      <span className="fw-bold text-dark">{formatCurrency(invoice.grand_total)}</span>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Already Paid</small>
                      <span className="fw-semibold text-success">{formatCurrency(invoice.paid_amount)}</span>
                    </div>
                    <div className="col-6 text-end">
                      <small className="text-muted d-block">Outstanding Balance</small>
                      <span className="fw-bold text-danger fs-6">{formatCurrency(invoice.balance_amount)}</span>
                    </div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold fs-7">Payment Amount (₹) <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text bg-white">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={invoice.balance_amount}
                        className="form-control form-control-custom fw-bold"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                      />
                    </div>
                    <small className="text-muted">Max payable: {formatCurrency(invoice.balance_amount)}</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold fs-7">Payment Method <span className="text-danger">*</span></label>
                    <select
                      className="form-select form-select-custom"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="UPI">UPI (GooglePay / PhonePe / Paytm)</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold fs-7">Payment Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control form-control-custom"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold fs-7">Transaction ID / UTR Ref</label>
                    <input
                      type="text"
                      className="form-control form-control-custom"
                      placeholder="e.g. UPI/2026/123456"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold fs-7">Payment Notes / Remarks</label>
                    <textarea
                      className="form-control form-control-custom"
                      rows="2"
                      placeholder="Optional notes or cheque number details..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-light px-3" onClick={onClose} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-custom px-4" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Recording & Generating Receipt...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check2-circle me-1"></i>
                        Save Payment & Generate Receipt
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
