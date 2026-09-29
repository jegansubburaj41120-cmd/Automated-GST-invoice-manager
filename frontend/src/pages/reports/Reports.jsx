import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/reportService';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'react-toastify';

export default function Reports() {
  const [activeTab, setActiveTab] = useState('gst'); // 'gst', 'sales', 'outstanding'
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Data states
  const [gstData, setGstData] = useState([]);
  const [gstTotals, setGstTotals] = useState({});
  const [salesData, setSalesData] = useState([]);
  const [salesTotals, setSalesTotals] = useState({});
  const [outstandingData, setOutstandingData] = useState([]);
  const [totalOutstandingSum, setTotalOutstandingSum] = useState(0);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        from_date: fromDate || undefined,
        to_date: toDate || undefined
      };

      if (activeTab === 'gst') {
        const res = await reportService.getGstReport(params);
        if (res.success) {
          setGstData(res.data);
          setGstTotals(res.totals || {});
        }
      } else if (activeTab === 'sales') {
        const res = await reportService.getSalesReport(params);
        if (res.success) {
          setSalesData(res.data);
          setSalesTotals(res.totals || {});
        }
      } else if (activeTab === 'outstanding') {
        const res = await reportService.getOutstandingReport();
        if (res.success) {
          setOutstandingData(res.data);
          setTotalOutstandingSum(res.totalOutstandingSum || 0);
        }
      }
    } catch (err) {
      toast.error('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, fromDate, toDate]);

  // CSV Export utility
  const exportCsv = () => {
    let rows = [];
    let filename = 'report.csv';

    if (activeTab === 'gst') {
      filename = `GST_Report_${Date.now()}.csv`;
      rows.push(['Invoice Number', 'Invoice Date', 'Customer Name', 'Customer GSTIN', 'Place of Supply', 'Taxable Value', 'CGST', 'SGST', 'IGST', 'Total GST', 'Grand Total']);
      gstData.forEach((r) => {
        rows.push([
          r.invoice_number,
          r.invoice_date,
          `"${r.customer_name}"`,
          r.customer_gstin || 'Unregistered',
          `"${r.place_of_supply}"`,
          r.taxable_amount,
          r.cgst_amount,
          r.sgst_amount,
          r.igst_amount,
          r.total_tax,
          r.grand_total
        ]);
      });
      rows.push(['TOTALS', '', '', '', '', gstTotals.totalTaxable, gstTotals.totalCgst, gstTotals.totalSgst, gstTotals.totalIgst, gstTotals.totalTax, gstTotals.totalGrand]);
    } else if (activeTab === 'sales') {
      filename = `Sales_Report_${Date.now()}.csv`;
      rows.push(['Invoice Number', 'Date', 'Customer', 'Subtotal', 'Discount', 'Taxable Value', 'GST', 'Grand Total', 'Paid', 'Balance', 'Status']);
      salesData.forEach((r) => {
        rows.push([
          r.invoice_number,
          r.invoice_date,
          `"${r.customer_name}"`,
          r.subtotal,
          r.discount_amount,
          r.taxable_amount,
          r.total_tax,
          r.grand_total,
          r.paid_amount,
          r.balance_amount,
          r.status
        ]);
      });
    } else {
      filename = `Outstanding_Balances_${Date.now()}.csv`;
      rows.push(['Customer Name', 'Phone', 'GSTIN', 'Pending Invoices', 'Total Invoiced', 'Total Paid', 'Outstanding Balance']);
      outstandingData.forEach((r) => {
        rows.push([
          `"${r.customer_name}"`,
          r.customer_phone,
          r.customer_gstin || 'Unregistered',
          r.pending_invoices_count,
          r.total_invoiced,
          r.total_paid,
          r.total_outstanding
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">Financial & GST Reports</h4>
          <p className="text-muted small mb-0">Generate GSTR-1 summaries, monthly sales audits, and receivables ledgers</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-success d-flex align-items-center gap-2" onClick={exportCsv}>
            <i className="bi bi-file-earmark-spreadsheet-fill"></i>
            <span>Export to CSV</span>
          </button>
          <button className="btn btn-light border" onClick={() => window.print()}>
            <i className="bi bi-printer me-1"></i> Print Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold ${activeTab === 'gst' ? 'active btn-primary-custom text-white' : 'bg-white border text-secondary'}`}
            onClick={() => setActiveTab('gst')}
          >
            <i className="bi bi-receipt-cutoff me-2"></i> GSTR-1 Tax Report
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold ${activeTab === 'sales' ? 'active btn-primary-custom text-white' : 'bg-white border text-secondary'}`}
            onClick={() => setActiveTab('sales')}
          >
            <i className="bi bi-graph-up-arrow me-2"></i> Sales Turnover Report
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link px-4 py-2 fw-semibold ${activeTab === 'outstanding' ? 'active btn-primary-custom text-white' : 'bg-white border text-secondary'}`}
            onClick={() => setActiveTab('outstanding')}
          >
            <i className="bi bi-clock-history me-2"></i> Outstanding Receivables
          </button>
        </li>
      </ul>

      {/* Filter Bar (for date range) */}
      {activeTab !== 'outstanding' && (
        <div className="dashboard-card p-3 mb-4">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-sm-4">
              <label className="form-label small fw-semibold text-muted mb-1">From Date</label>
              <input
                type="date"
                className="form-control form-control-custom"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-4">
              <label className="form-label small fw-semibold text-muted mb-1">To Date</label>
              <input
                type="date"
                className="form-control form-control-custom"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="col-12 col-sm-4 d-flex align-items-end">
              <button className="btn btn-light border w-100 py-2" onClick={() => { setFromDate(''); setToDate(''); }}>
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: GST REPORT */}
      {activeTab === 'gst' && (
        <div className="dashboard-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-dark brand-font mb-0">GST Output Tax Statement (GSTR-1 Summary)</h6>
            <span className="badge bg-primary-subtle text-primary border px-2 py-1">
              {gstTotals.invoiceCount || 0} Invoices
            </span>
          </div>

          <div className="table-responsive">
            <table className="custom-table table-sm">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Customer GSTIN</th>
                  <th>Place of Supply</th>
                  <th>Taxable Value</th>
                  <th>CGST</th>
                  <th>SGST</th>
                  <th>IGST</th>
                  <th>Total GST</th>
                  <th className="text-end">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                    </td>
                  </tr>
                ) : gstData.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center py-5 text-muted">No records found for date range.</td>
                  </tr>
                ) : (
                  gstData.map((r) => (
                    <tr key={r.id}>
                      <td className="font-monospace fw-bold text-primary">{r.invoice_number}</td>
                      <td>{formatDate(r.invoice_date)}</td>
                      <td>
                        <span className="font-monospace text-secondary small">
                          {r.customer_gstin || 'Unregistered'}
                        </span>
                      </td>
                      <td>{r.place_of_supply} ({r.place_of_supply_code})</td>
                      <td className="fw-semibold">{formatCurrency(r.taxable_amount)}</td>
                      <td>{formatCurrency(r.cgst_amount)}</td>
                      <td>{formatCurrency(r.sgst_amount)}</td>
                      <td>{formatCurrency(r.igst_amount)}</td>
                      <td className="fw-bold text-teal">{formatCurrency(r.total_tax)}</td>
                      <td className="text-end fw-bold text-dark">{formatCurrency(r.grand_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {/* Aggregated Totals Footer */}
              <tfoot className="table-light fw-bold border-top border-2">
                <tr>
                  <td colSpan="4" className="text-uppercase text-dark">Total Output Tax Liability</td>
                  <td>{formatCurrency(gstTotals.totalTaxable)}</td>
                  <td>{formatCurrency(gstTotals.totalCgst)}</td>
                  <td>{formatCurrency(gstTotals.totalSgst)}</td>
                  <td>{formatCurrency(gstTotals.totalIgst)}</td>
                  <td className="text-teal">{formatCurrency(gstTotals.totalTax)}</td>
                  <td className="text-end text-primary fs-7">{formatCurrency(gstTotals.totalGrand)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SALES REPORT */}
      {activeTab === 'sales' && (
        <div className="dashboard-card p-4">
          <h6 className="fw-bold text-dark brand-font mb-3">Sales Turnover & Collections Summary</h6>
          <div className="table-responsive">
            <table className="custom-table table-sm">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>Taxable Val</th>
                  <th>Total GST</th>
                  <th>Grand Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="text-center py-5"><div className="spinner-border text-primary spinner-border-sm"></div></td>
                  </tr>
                ) : salesData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-5 text-muted">No sales records found.</td>
                  </tr>
                ) : (
                  salesData.map((s) => (
                    <tr key={s.id}>
                      <td className="font-monospace fw-bold text-primary">{s.invoice_number}</td>
                      <td>{formatDate(s.invoice_date)}</td>
                      <td>{s.customer_name}</td>
                      <td>{formatCurrency(s.subtotal)}</td>
                      <td className="text-danger">- {formatCurrency(s.discount_amount)}</td>
                      <td>{formatCurrency(s.taxable_amount)}</td>
                      <td className="text-teal">{formatCurrency(s.total_tax)}</td>
                      <td className="fw-bold text-dark">{formatCurrency(s.grand_total)}</td>
                      <td className="text-success fw-semibold">{formatCurrency(s.paid_amount)}</td>
                      <td className="text-danger fw-semibold">{formatCurrency(s.balance_amount)}</td>
                      <td>
                        <span className={`badge ${s.status === 'PAID' ? 'badge-paid' : s.status === 'PARTIALLY PAID' ? 'badge-partial' : 'badge-unpaid'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="table-light fw-bold border-top border-2">
                <tr>
                  <td colSpan="3" className="text-uppercase text-dark">Grand Summary</td>
                  <td>{formatCurrency(salesTotals.totalSubtotal)}</td>
                  <td className="text-danger">- {formatCurrency(salesTotals.totalDiscount)}</td>
                  <td>{formatCurrency(salesTotals.totalTaxable)}</td>
                  <td className="text-teal">{formatCurrency(salesTotals.totalTax)}</td>
                  <td className="text-dark">{formatCurrency(salesTotals.totalGrand)}</td>
                  <td className="text-success">{formatCurrency(salesTotals.totalPaid)}</td>
                  <td className="text-danger">{formatCurrency(salesTotals.totalBalance)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: OUTSTANDING REPORT */}
      {activeTab === 'outstanding' && (
        <div className="dashboard-card p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-bold text-dark brand-font mb-0">Customer Outstanding Balance Ledger</h6>
            <div className="p-2 px-3 bg-danger-subtle rounded-3 border border-danger">
              <small className="text-danger fw-bold me-2">Total Receivables:</small>
              <span className="fw-bold text-danger fs-6">{formatCurrency(totalOutstandingSum)}</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table table-sm">
              <thead>
                <tr>
                  <th>Customer Name</th>
                  <th>Phone</th>
                  <th>GSTIN</th>
                  <th>Pending Invoices</th>
                  <th>Earliest Due Date</th>
                  <th>Total Billed</th>
                  <th>Total Paid</th>
                  <th className="text-end">Outstanding Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5"><div className="spinner-border text-primary spinner-border-sm"></div></td>
                  </tr>
                ) : outstandingData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-success fw-semibold">
                      🎉 Outstanding balance is ₹0.00! All customer invoices are paid in full.
                    </td>
                  </tr>
                ) : (
                  outstandingData.map((o) => (
                    <tr key={o.customer_id}>
                      <td className="fw-bold text-dark">{o.customer_name}</td>
                      <td>{o.customer_phone}</td>
                      <td className="font-monospace text-secondary small">{o.customer_gstin || 'Unregistered'}</td>
                      <td>
                        <span className="badge bg-warning-subtle text-warning-emphasis border border-warning px-2">
                          {o.pending_invoices_count} Invoices
                        </span>
                      </td>
                      <td>{formatDate(o.earliest_due_date)}</td>
                      <td>{formatCurrency(o.total_invoiced)}</td>
                      <td className="text-success">{formatCurrency(o.total_paid)}</td>
                      <td className="text-end fw-bold text-danger fs-7">
                        {formatCurrency(o.total_outstanding)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
