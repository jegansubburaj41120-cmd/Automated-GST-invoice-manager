import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

export default function Login() {
  const [activePortal, setActivePortal] = useState('admin'); // 'admin' | 'staff'
  const [email, setEmail] = useState('admin@gstmanager.com');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handlePortalSwitch = (portal) => {
    setActivePortal(portal);
    if (portal === 'admin') {
      setEmail('admin@gstmanager.com');
      setPassword('Admin@123');
    } else {
      setEmail('staff@gstmanager.com');
      setPassword('Staff@123');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.warning('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await login(email, password, activePortal);
      if (res.success) {
        toast.success(`Welcome ${res.user.name} (${res.user.role.toUpperCase()})!`);
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const isAdminPortal = activePortal === 'admin';

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center py-5"
      style={{
        background: isAdminPortal
          ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)'
          : 'linear-gradient(135deg, #042f2e 0%, #0f172a 50%, #134e4a 100%)',
        transition: 'background 0.4s ease'
      }}
    >
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-5">
            {/* Header Brand */}
            <div className="text-center mb-4">
              <div
                className="d-inline-flex align-items-center justify-content-center p-3 rounded-4 mb-2 shadow-lg"
                style={{
                  background: isAdminPortal
                    ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)'
                    : 'linear-gradient(135deg, #0d9488 0%, #10b981 100%)',
                  color: '#fff',
                  transition: 'all 0.3s ease'
                }}
              >
                <i className={`bi ${isAdminPortal ? 'bi-shield-lock-fill' : 'bi-person-badge-fill'} fs-2`}></i>
              </div>
              <h3 className="fw-bold brand-font text-white mb-1">GST Billing & Receipt Pro</h3>
              <p className="text-light opacity-75 small">GST Invoice & Payment Receipt Management System</p>
            </div>

            {/* Separate Portals Switcher Tabs */}
            <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.98)' }}>
              <div className="p-2 bg-light border-bottom">
                <div className="nav nav-pills nav-fill gap-1 p-1 bg-white rounded-3 border">
                  <button
                    type="button"
                    className={`nav-link py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 ${
                      isAdminPortal ? 'active bg-primary text-white shadow-sm' : 'text-secondary'
                    }`}
                    onClick={() => handlePortalSwitch('admin')}
                    style={{ borderRadius: '8px', transition: 'all 0.2s ease' }}
                  >
                    <i className="bi bi-shield-lock-fill fs-6"></i>
                    <span>Admin Login</span>
                  </button>
                  <button
                    type="button"
                    className={`nav-link py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 ${
                      !isAdminPortal ? 'active btn-teal-custom text-white shadow-sm' : 'text-secondary'
                    }`}
                    onClick={() => handlePortalSwitch('staff')}
                    style={{ borderRadius: '8px', transition: 'all 0.2s ease' }}
                  >
                    <i className="bi bi-people-fill fs-6"></i>
                    <span>User / Staff Login</span>
                  </button>
                </div>
              </div>

              <div className="card-body p-4 p-md-5 pt-4">
                {/* Portal Banner */}
                <div className={`p-3 rounded-3 mb-4 border ${isAdminPortal ? 'bg-primary-subtle border-primary-subtle' : 'bg-success-subtle border-success-subtle'}`}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span className={`badge ${isAdminPortal ? 'bg-primary' : 'bg-success'} text-uppercase font-monospace px-2.5 py-1`}>
                      <i className={`bi ${isAdminPortal ? 'bi-shield-check' : 'bi-person-check'} me-1`}></i>
                      {isAdminPortal ? 'Administrator Portal' : 'Staff Billing Portal'}
                    </span>
                    <span className="small text-muted fw-semibold">
                      {isAdminPortal ? 'Full Authority' : 'Billing Access'}
                    </span>
                  </div>
                  <small className="d-block text-secondary mt-1">
                    {isAdminPortal
                      ? 'Access full administration, system settings, financial reports & user control.'
                      : 'Access customer creation, invoice generation, payment recording & receipt printing.'}
                  </small>
                </div>

                {/* Login Form */}
                <form onSubmit={handleLogin}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold fs-7 text-secondary">
                      {isAdminPortal ? 'Admin Email Address' : 'Staff / User Email Address'}
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0 text-muted">
                        <i className="bi bi-envelope"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control form-control-custom border-start-0 ps-0"
                        placeholder={isAdminPortal ? 'admin@gstmanager.com' : 'staff@gstmanager.com'}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label fw-semibold fs-7 text-secondary mb-0">Password</label>
                      <small className="text-muted font-monospace" style={{ fontSize: '0.72rem' }}>
                        Default: {isAdminPortal ? 'Admin@123' : 'Staff@123'}
                      </small>
                    </div>
                    <div className="input-group">
                      <span className="input-group-text bg-white border-end-0 text-muted">
                        <i className="bi bi-lock"></i>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-control form-control-custom border-start-0 ps-0"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`btn w-100 py-2.5 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-sm ${
                      isAdminPortal ? 'btn-primary-custom' : 'btn-teal-custom'
                    }`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In as {isAdminPortal ? 'Administrator' : 'Staff / User'}</span>
                        <i className="bi bi-arrow-right"></i>
                      </>
                    )}
                  </button>
                </form>

                {/* Switch helper */}
                <div className="mt-4 pt-3 border-top text-center">
                  <span className="text-muted small">
                    {isAdminPortal ? 'Are you a staff member?' : 'Are you an administrator?'}
                  </span>
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ms-1 fw-bold text-decoration-none"
                    onClick={() => handlePortalSwitch(isAdminPortal ? 'staff' : 'admin')}
                  >
                    Switch to {isAdminPortal ? 'User / Staff Login' : 'Admin Login'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
