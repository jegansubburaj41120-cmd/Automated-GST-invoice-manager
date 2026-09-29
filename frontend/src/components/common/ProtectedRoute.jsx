import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export function ProtectedRoute({ requireAdmin = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted fw-semibold">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="p-5 text-center">
        <div className="alert alert-danger d-inline-block p-4 shadow-sm">
          <i className="bi bi-shield-lock-fill fs-1 text-danger mb-3 d-block"></i>
          <h4 className="alert-heading fw-bold">Access Denied</h4>
          <p className="mb-0">You need Administrator privileges to access this section.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
