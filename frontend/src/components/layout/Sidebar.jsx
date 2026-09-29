import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, closeSidebar }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (window.innerWidth < 992) {
      closeSidebar();
    }
  };

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="d-flex align-items-center gap-2">
          <div className="sidebar-brand-logo">
            <i className="bi bi-receipt-cutoff"></i>
          </div>
          <div>
            <h5 className="mb-0 text-white fw-bold brand-font fs-6">GST Manager</h5>
            <small className="text-secondary" style={{ fontSize: '0.72rem' }}>Invoice & Receipts</small>
          </div>
        </div>
      </div>

      <ul className="sidebar-menu">
        <div className="sidebar-section-title">Core Management</div>
        <li>
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <i className="bi bi-grid-1x2-fill"></i>
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/invoices/new" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <i className="bi bi-file-earmark-plus-fill text-warning"></i>
            <span>Create Invoice</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/invoices" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <i className="bi bi-file-text-fill"></i>
            <span>All Invoices</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/receipts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <i className="bi bi-check-circle-fill text-success"></i>
            <span>Payment Receipts</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/payments" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <i className="bi bi-wallet2"></i>
            <span>Payment History</span>
          </NavLink>
        </li>

        <div className="sidebar-section-title">Entities & Catalog</div>
        <li>
          <NavLink to="/customers" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <i className="bi bi-people-fill"></i>
            <span>Customers</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/products" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <i className="bi bi-box-seam-fill"></i>
            <span>Products & Stock</span>
          </NavLink>
        </li>

        <div className="sidebar-section-title">Analytics</div>
        <li>
          <NavLink to="/reports" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
            <i className="bi bi-bar-chart-line-fill"></i>
            <span>GST & Sales Reports</span>
          </NavLink>
        </li>

        {isAdmin && (
          <>
            <div className="sidebar-section-title">Administration</div>
            <li>
              <NavLink to="/users" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
                <i className="bi bi-person-badge-fill"></i>
                <span>Staff & Users</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
                <i className="bi bi-gear-fill"></i>
                <span>Company Settings</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/audit-logs" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} onClick={handleLinkClick}>
                <i className="bi bi-shield-check"></i>
                <span>Audit Logs</span>
              </NavLink>
            </li>
          </>
        )}
      </ul>

      <div className="sidebar-footer">
        <button
          onClick={logout}
          className="btn btn-outline-light btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
          style={{ opacity: 0.8 }}
        >
          <i className="bi bi-box-arrow-left"></i>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
