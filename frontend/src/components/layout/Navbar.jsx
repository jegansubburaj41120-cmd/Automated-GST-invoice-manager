import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export default function Navbar({ toggleSidebar }) {
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useSettings();

  return (
    <header className="topbar">
      <div className="d-flex align-items-center gap-3">
        <button
          className="btn btn-light d-lg-none p-1 px-2 border"
          onClick={toggleSidebar}
          aria-label="Toggle Navigation"
        >
          <i className="bi bi-list fs-5"></i>
        </button>
        <div>
          <h5 className="mb-0 fw-bold d-flex align-items-center gap-2">
            <span className="text-primary d-none d-md-inline">{settings?.company_name || 'GST Billing System'}</span>
          </h5>
          <small className="text-muted d-none d-sm-inline">GSTIN: {settings?.gstin || '27AAACA1234F1Z5'}</small>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Quick status badge */}
        <div className="d-none d-md-flex align-items-center gap-2 px-3 py-1 bg-light rounded-pill border">
          <span className="badge rounded-pill bg-success p-1"><span className="visually-hidden">online</span></span>
          <small className="text-secondary fw-semibold">State: {settings?.state || 'Maharashtra'} ({settings?.state_code || '27'})</small>
        </div>

        {/* User profile dropdown */}
        <div className="dropdown">
          <button
            className="btn btn-link text-decoration-none p-0 d-flex align-items-center gap-2 dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <div
              className="rounded-circle text-white d-flex align-items-center justify-content-center fw-bold shadow-sm"
              style={{
                width: '38px',
                height: '38px',
                background: isAdmin ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #0d9488 0%, #059669 100%)'
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="text-start d-none d-sm-block">
              <div className="fw-semibold text-dark fs-7 lh-1 mb-1">{user?.name || 'User'}</div>
              <span className={`badge ${isAdmin ? 'bg-primary' : 'bg-success'} text-white text-uppercase font-monospace`} style={{ fontSize: '0.65rem' }}>
                {user?.role}
              </span>
            </div>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow border-0 mt-2">
            <li className="px-3 py-2 border-bottom">
              <p className="mb-0 fw-bold">{user?.name}</p>
              <small className="text-muted">{user?.email}</small>
            </li>
            <li>
              <button className="dropdown-item py-2 text-danger d-flex align-items-center gap-2" onClick={logout}>
                <i className="bi bi-box-arrow-right"></i> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
}
