import React, { useState, useEffect } from 'react';
import { receiptService } from '../../services/receiptService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'react-toastify';

export default function ReceiptViewModal({ show, receiptId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (show && receiptId) {
      setLoading(true);
      receiptService
        .getReceiptById(receiptId)
        .then((res) => {
          if (res.success) {
            setData(res.data);
          }
        })
        .catch((err) => {
          toast.error('Failed to load receipt details.');
        })
        .finally(() => setLoading(false));
    }
  }, [show, receiptId]);

  if (!show) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (data?.receipt?.pdf_path) {
      window.open(data.receipt.pdf_path, '_blank');
    }
  };

  const receipt = data?.receipt;
  const settings = data?.settings;

  return (
    <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4">
          <div className="modal-header bg-dark text-white p-3 px-4 d-flex justify-content-between align-items-center">
            <h5 className="modal-title fw-bold fs-6 d-flex align-items-center gap-2">
              <i className="bi bi-receipt text-teal"></i>
              Payment Receipt Preview - {receipt?.receipt_number || 'Loading...'}
            </h5>
            <div className="d-flex align-items-center gap-2">
              {receipt?.pdf_path && (
                <button className="btn btn-sm btn-teal-custom d-flex align-items-center gap-1" onClick={handleDownloadPdf}>
                  <i className="bi bi-download"></i> Download PDF
                </button>
              )}
              <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
            </div>
          </div>

          <div className="modal-body p-4 bg-light">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2 text-muted">Loading receipt...</p>
              </div>
            ) : !receipt ? (
              <div className="text-center py-5 text-danger">Receipt details unavailable.</div>
            ) : (
              <div className="receipt-paper p-4 bg-white border rounded-3 shadow-sm">
                {/* Top Company & Title Header */}
                <div className="row pb-3 mb-3 border-bottom align-items-center">
                  <div className="col-sm-7">
                    <h5 className="fw-bold text-teal mb-1 brand-font">{settings?.company_name || 'Acme Solutions'}</h5>
                    <p className="text-muted small mb-1">{settings?.business_address}, {settings?.city} - {settings?.pincode}, {settings?.state}</p>
                    <small className="text-muted d-block">Phone: {settings?.phone} | Email: {settings?.email}</small>
                    <small className="fw-semibold text-secondary">GSTIN: {settings?.gstin} | PAN: {settings?.pan}</small>
                  </div>
                  <div className="col-sm-5 text-sm-end mt-3 mt-sm-0">
                    <span className="badge bg-teal-subtle text-teal border border-teal-subtle px-3 py-2 fw-bold text-uppercase fs-7 mb-2 d-inline-block">
                      PAYMENT RECEIPT
                    </span>
                    <div className="small">
                      <div><strong>Receipt No:</strong> {receipt.receipt_number}</div>
                      <div><strong>Date:</strong> {formatDate(receipt.receipt_date)}</div>
                    </div>
                  </div>
                </div>

                {/* Customer and Reference Box */}
                <div className="row g-3 mb-4">
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3 h-100 border">
                      <small className="text-muted fw-bold text-uppercase d-block mb-1">Received From</small>
                      <h6 className="fw-bold text-dark mb-1">{receipt.customer_name}</h6>
                      <p className="small text-muted mb-1">{receipt.customer_address}, {receipt.customer_city}</p>
                      <small className="text-muted d-block">Phone: {receipt.customer_phone}</small>
                      <small className="text-secondary fw-semibold">GSTIN: {receipt.customer_gstin || 'Unregistered'}</small>
                    </div>
                  </div>
                  <div className="col-sm-6">
                    <div className="p-3 bg-light rounded-3 h-100 border">
                      <small className="text-muted fw-bold text-uppercase d-block mb-1">Invoice Reference</small>
                      <div className="small mb-1"><strong>Invoice Number:</strong> {receipt.invoice_number}</div>
                      <div className="small mb-1"><strong>Invoice Date:</strong> {formatDate(receipt.invoice_date)}</div>
                      <div className="small mb-1"><strong>Payment Method:</strong> {receipt.payment_method}</div>
                      <div className="small"><strong>Transaction Ref:</strong> {receipt.transaction_reference || 'N/A'}</div>
                    </div>
                  </div>
                </div>

                {/* Amount Highlight Box */}
                <div className="p-3 rounded-3 mb-4 text-center border" style={{ backgroundColor: '#f0fdfa', borderColor: '#ccfbf1' }}>
                  <small className="text-teal text-uppercase fw-bold d-block">Amount Received</small>
                  <h2 className="fw-bold text-teal mb-0 brand-font">{formatCurrency(receipt.amount)}</h2>
                </div>

                {/* Invoice Status Progression */}
                <div className="table-responsive mb-4">
                  <table className="table table-bordered table-sm text-center mb-0">
                    <thead className="table-dark">
                      <tr>
                        <th>Invoice Total</th>
                        <th>Previously Paid</th>
                        <th>Current Payment</th>
                        <th>Balance Due</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="fw-bold">
                        <td>{formatCurrency(receipt.invoice_grand_total)}</td>
                        <td>{formatCurrency(Math.max(0, receipt.invoice_paid_amount - receipt.amount))}</td>
                        <td className="text-success">{formatCurrency(receipt.amount)}</td>
                        <td className={receipt.invoice_balance_amount <= 0 ? 'text-success' : 'text-danger'}>
                          {formatCurrency(receipt.invoice_balance_amount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Verification QR & Bank Info */}
                <div className="row g-3 pt-3 border-top align-items-center">
                  <div className="col-sm-7">
                    <h6 className="fw-bold fs-7 text-uppercase text-secondary mb-1">Bank Account</h6>
                    <p className="small text-muted mb-0">
                      {settings?.bank_name} | A/C: {settings?.account_number} | IFSC: {settings?.ifsc}
                    </p>
                    <small className="text-muted">UPI ID: {settings?.upi_id}</small>
                  </div>
                  <div className="col-sm-5 text-sm-end">
                    <small className="text-muted d-block">For {settings?.company_name}</small>
                    <div style={{ height: '45px' }}></div>
                    <small className="fw-bold text-dark border-top pt-1 d-inline-block px-3">
                      Authorized Signatory
                    </small>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer bg-white p-3">
            <button type="button" className="btn btn-secondary px-3" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-teal-custom px-4" onClick={handleDownloadPdf}>
              <i className="bi bi-file-earmark-pdf-fill me-1"></i> Open / Print PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
