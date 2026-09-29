import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Layout & Guards
import Layout from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import CustomerList from './pages/customers/CustomerList';
import ProductList from './pages/products/ProductList';
import InvoiceList from './pages/invoices/InvoiceList';
import CreateInvoice from './pages/invoices/CreateInvoice';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import ReceiptList from './pages/receipts/ReceiptList';
import PaymentList from './pages/payments/PaymentList';
import Reports from './pages/reports/Reports';
import Settings from './pages/settings/Settings';
import UserList from './pages/users/UserList';
import AuditLogList from './pages/audit/AuditLogList';

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected App Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<CustomerList />} />
                <Route path="/products" element={<ProductList />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/invoices/new" element={<CreateInvoice />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/receipts" element={<ReceiptList />} />
                <Route path="/payments" element={<PaymentList />} />
                <Route path="/reports" element={<Reports />} />

                {/* Admin Only Protected Routes */}
                <Route element={<ProtectedRoute requireAdmin={true} />}>
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/users" element={<UserList />} />
                  <Route path="/audit-logs" element={<AuditLogList />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>

        <ToastContainer
          position="top-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          theme="colored"
        />
      </SettingsProvider>
    </AuthProvider>
  );
}
