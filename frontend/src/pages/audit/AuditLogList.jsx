import React, { useState, useEffect } from 'react';
import { auditService } from '../../services/settingsService';
import { formatDateTime } from '../../utils/formatters';
import Pagination from '../../components/common/Pagination';
import { toast } from 'react-toastify';

export default function AuditLogList() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await auditService.getAuditLogs({
        page,
        limit: 15,
        search,
        module: moduleFilter || undefined
      });
      if (res.success) {
        setLogs(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load audit trail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, search, moduleFilter]);

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">System Audit Logs</h4>
          <p className="text-muted small mb-0">Security & activity tracking trail for invoices, payments, master data edits, and logins</p>
        </div>
      </div>

      {/* Filters */}
      <div className="dashboard-card p-3 mb-4">
        <div className="row g-3">
          <div className="col-12 col-md-8">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-search"></i></span>
              <input
                type="text"
                className="form-control form-control-custom border-start-0 ps-0"
                placeholder="Search audit trail by user, action or details..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="col-12 col-md-4">
            <select
              className="form-select form-select-custom"
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Modules</option>
              <option value="AUTH">AUTH</option>
              <option value="INVOICES">INVOICES</option>
              <option value="PAYMENTS">PAYMENTS</option>
              <option value="CUSTOMERS">CUSTOMERS</option>
              <option value="PRODUCTS">PRODUCTS</option>
              <option value="SETTINGS">SETTINGS</option>
              <option value="USERS">USERS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="dashboard-card p-4">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Operator</th>
                <th>Module</th>
                <th>Action</th>
                <th>Record Ref</th>
                <th>Activity Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">No audit logs recorded yet.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <small className="font-monospace text-muted">{formatDateTime(log.created_at)}</small>
                    </td>
                    <td>
                      <div className="fw-semibold text-dark">{log.user_name || 'System'}</div>
                      <span className="badge bg-light text-muted border font-monospace" style={{ fontSize: '0.65rem' }}>
                        {log.user_role}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-primary-subtle text-primary border border-primary px-2">
                        {log.module}
                      </span>
                    </td>
                    <td>
                      <span className="fw-semibold font-monospace small text-dark">
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <span className="font-monospace text-muted small">{log.record_id || '---'}</span>
                    </td>
                    <td>
                      <span className="small text-secondary">{log.details || '---'}</span>
                    </td>
                    <td>
                      <small className="font-monospace text-muted">{log.ip_address || '127.0.0.1'}</small>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>
    </div>
  );
}
