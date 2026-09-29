import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { reportService } from '../../services/reportService';
import StatCard from '../../components/common/StatCard';
import PaymentModal from '../../components/common/PaymentModal';
import ReceiptViewModal from '../../components/common/ReceiptViewModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { toast } from 'react-toastify';

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await reportService.getDashboardData();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      toast.error('Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-muted fw-semibold">Loading real-time business metrics...</p>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {};
  const monthlyData = data?.monthlyData || [];
  const topProducts = data?.topProducts || [];
  const customerSales = data?.customerSales || [];
  const recentInvoices = data?.recentInvoices || [];
  const recentReceipts = data?.recentReceipts || [];

  // Chart 1: Monthly Sales & Invoices Trend
  const salesChartData = {
    labels: monthlyData.length > 0 ? monthlyData.map(m => m.month_label) : ['Current'],
    datasets: [
      {
        type: 'bar',
        label: 'Sales Revenue (₹)',
        data: monthlyData.length > 0 ? monthlyData.map(m => Number(m.monthly_sales)) : [stats.totalSales || 0],
        backgroundColor: 'rgba(79, 70, 229, 0.85)',
        borderRadius: 6,
        yAxisID: 'y'
      },
      {
        type: 'line',
        label: 'GST Collected (₹)',
        data: monthlyData.length > 0 ? monthlyData.map(m => Number(m.monthly_gst)) : [stats.totalGstCollected || 0],
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.3,
        yAxisID: 'y'
      }
    ]
  };

  // Chart 2: Top Products Bar Chart
  const topProductsChartData = {
    labels: topProducts.length > 0 ? topProducts.map(p => p.product_name.length > 18 ? p.product_name.slice(0, 18) + '...' : p.product_name) : ['No Products'],
    datasets: [
      {
        label: 'Revenue (₹)',
        data: topProducts.length > 0 ? topProducts.map(p => Number(p.total_revenue)) : [0],
        backgroundColor: ['#6366f1', '#0d9488', '#f59e0b', '#ec4899', '#8b5cf6'],
        borderRadius: 6
      }
    ]
  };

  // Chart 3: Customer-wise Sales Doughnut
  const customerDoughnutData = {
    labels: customerSales.length > 0 ? customerSales.map(c => c.customer_name) : ['General'],
    datasets: [
      {
        data: customerSales.length > 0 ? customerSales.map(c => Number(c.total_sales)) : [1],
        backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'],
        borderWidth: 2
      }
    ]
  };

  return (
    <div>
      {/* Top Welcome & Quick Action Banner */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">GST Billing Management System</h4>
          <p className="text-muted small mb-0">Overview of GST Invoices, Payment Receipts, and Collections</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/invoices/new" className="btn btn-primary-custom d-flex align-items-center gap-2">
            <i className="bi bi-file-earmark-plus-fill"></i>
            <span>Create Invoice</span>
          </Link>
          <Link to="/customers" className="btn btn-light border d-flex align-items-center gap-2">
            <i className="bi bi-person-plus-fill text-primary"></i>
            <span>Add Customer</span>
          </Link>
        </div>
      </div>

      {/* 8 Metric KPI Cards Grid */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Sales"
            value={formatCurrency(stats.totalSales)}
            icon="bi-currency-rupee"
            color="primary"
            subtext="Cumulative billed turnover"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total GST Collected"
            value={formatCurrency(stats.totalGstCollected)}
            icon="bi-piggy-bank-fill"
            color="teal"
            subtext="CGST + SGST + IGST"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Total Invoices"
            value={stats.totalInvoices}
            icon="bi-file-earmark-text-fill"
            color="info"
            subtext="Tax invoices generated"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Payment Receipts"
            value={stats.totalReceipts}
            icon="bi-check-all"
            color="success"
            subtext="Verified payment receipts"
          />
        </div>

        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Paid Amount"
            value={formatCurrency(stats.paidAmount)}
            icon="bi-cash-stack"
            color="success"
            subtext="Total collected payments"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Pending Receivables"
            value={formatCurrency(stats.pendingPayments)}
            icon="bi-hourglass-split"
            color="danger"
            subtext="Outstanding invoice balances"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Active Customers"
            value={stats.totalCustomers}
            icon="bi-people-fill"
            color="purple"
            subtext="Registered & walk-in"
          />
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <StatCard
            title="Products Catalog"
            value={stats.totalProducts}
            icon="bi-box-seam-fill"
            color="warning"
            subtext="Tracked items & services"
          />
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="row g-4 mb-4">
        {/* Sales & GST Trend */}
        <div className="col-12 col-lg-8">
          <div className="dashboard-card p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-dark brand-font mb-0">Monthly Sales & GST Collection</h6>
              <span className="badge bg-light text-secondary border">Real-time Data</span>
            </div>
            <div style={{ height: '280px' }}>
              <Bar
                data={salesChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: (v) => '₹' + (v >= 1000 ? v / 1000 + 'k' : v)
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Customer-wise Share */}
        <div className="col-12 col-lg-4">
          <div className="dashboard-card p-4 h-100">
            <h6 className="fw-bold text-dark brand-font mb-3">Customer Revenue Breakdown</h6>
            <div style={{ height: '250px' }} className="d-flex align-items-center justify-content-center">
              {customerSales.length > 0 ? (
                <Doughnut
                  data={customerDoughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 12 } }
                    }
                  }}
                />
              ) : (
                <p className="text-muted small">No customer transactions yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Invoices & Recent Receipts */}
      <div className="row g-4">
        {/* Recent Invoices */}
        <div className="col-12 col-lg-6">
          <div className="dashboard-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-dark brand-font mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-file-text text-primary"></i> Recent Invoices
              </h6>
              <Link to="/invoices" className="btn btn-sm btn-link text-decoration-none">View All</Link>
            </div>

            <div className="table-responsive">
              <table className="custom-table table-sm">
                <thead>
                  <tr>
                    <th>Invoice No</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="fw-bold text-primary font-monospace">{inv.invoice_number}</td>
                      <td>{inv.customer_name}</td>
                      <td className="fw-semibold">{formatCurrency(inv.grand_total)}</td>
                      <td>
                        <span className={`badge ${inv.status === 'PAID' ? 'badge-paid' : inv.status === 'PARTIALLY PAID' ? 'badge-partial' : 'badge-unpaid'}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td>
                        {inv.status !== 'PAID' ? (
                          <button
                            className="btn btn-xs btn-outline-success py-1 px-2 text-nowrap"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => setSelectedInvoiceForPayment(inv)}
                          >
                            <i className="bi bi-cash me-1"></i> Pay
                          </button>
                        ) : (
                          <a
                            href={inv.pdf_path}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-xs btn-light border py-1 px-2"
                            style={{ fontSize: '0.75rem' }}
                          >
                            <i className="bi bi-file-pdf text-danger"></i> PDF
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                  {recentInvoices.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-3 text-muted">No invoices generated yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Payment Receipts */}
        <div className="col-12 col-lg-6">
          <div className="dashboard-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-bold text-dark brand-font mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-receipt-cutoff text-teal"></i> Recent Payment Receipts
              </h6>
              <Link to="/receipts" className="btn btn-sm btn-link text-decoration-none">View All</Link>
            </div>

            <div className="table-responsive">
              <table className="custom-table table-sm">
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReceipts.map((rec) => (
                    <tr key={rec.id}>
                      <td className="fw-bold text-teal font-monospace">{rec.receipt_number}</td>
                      <td>{rec.customer_name}</td>
                      <td className="fw-bold text-success">{formatCurrency(rec.amount)}</td>
                      <td><span className="badge bg-light text-dark border">{rec.payment_method}</span></td>
                      <td>
                        <button
                          className="btn btn-xs btn-outline-teal py-1 px-2 btn-sm text-nowrap"
                          style={{ fontSize: '0.75rem' }}
                          onClick={() => setSelectedReceiptId(rec.id)}
                        >
                          <i className="bi bi-eye"></i> View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentReceipts.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-3 text-muted">No payments recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Recording Modal */}
      {selectedInvoiceForPayment && (
        <PaymentModal
          show={!!selectedInvoiceForPayment}
          invoice={selectedInvoiceForPayment}
          onClose={() => setSelectedInvoiceForPayment(null)}
          onSuccess={fetchDashboardData}
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
