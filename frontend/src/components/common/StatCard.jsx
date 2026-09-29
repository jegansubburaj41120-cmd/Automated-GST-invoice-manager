import React from 'react';

export default function StatCard({ title, value, icon, color = 'primary', subtext, trend }) {
  const colorMap = {
    primary: { bg: '#eef2ff', text: '#4f46e5' },
    success: { bg: '#ecfdf5', text: '#059669' },
    warning: { bg: '#fffbeb', text: '#d97706' },
    danger: { bg: '#fef2f2', text: '#dc2626' },
    info: { bg: '#f0f9ff', text: '#0284c7' },
    teal: { bg: '#f0fdfa', text: '#0d9488' },
    purple: { bg: '#faf5ff', text: '#9333ea' }
  };

  const scheme = colorMap[color] || colorMap.primary;

  return (
    <div className="stat-widget h-100">
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <span className="text-muted fw-semibold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.04em' }}>
            {title}
          </span>
          <h3 className="fw-bold mb-1 mt-1 text-dark brand-font">{value}</h3>
          {subtext && <small className="text-muted">{subtext}</small>}
        </div>
        <div
          className="stat-icon-wrapper"
          style={{ backgroundColor: scheme.bg, color: scheme.text }}
        >
          <i className={`bi ${icon}`}></i>
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-2 border-top d-flex align-items-center gap-1">
          <small className="text-success fw-semibold">
            <i className="bi bi-arrow-up-right"></i> {trend}
          </small>
        </div>
      )}
    </div>
  );
}
