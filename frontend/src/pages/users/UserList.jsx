import React, { useState, useEffect } from 'react';
import { userService } from '../../services/settingsService';
import { formatDate, formatDateTime } from '../../utils/formatters';
import Pagination from '../../components/common/Pagination';
import { toast } from 'react-toastify';

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  // Form Modal
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const initialForm = {
    name: '',
    email: '',
    password: '',
    role: 'staff',
    phone: '',
    status: 'active'
  };
  const [formData, setFormData] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getUsers({
        page,
        limit: 10,
        search,
        role: roleFilter || undefined
      });
      if (res.success) {
        setUsers(res.data);
        setPagination(res.pagination);
      }
    } catch (err) {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData(initialForm);
    setShowModal(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    setFormData({
      name: u.name || '',
      email: u.email || '',
      password: '', // blank unless changing
      role: u.role || 'staff',
      phone: u.phone || '',
      status: u.status || 'active'
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingUser) {
        await userService.updateUser(editingUser.id, formData);
        toast.success('User updated successfully!');
      } else {
        if (!formData.password) {
          toast.warning('Password is required for new user accounts.');
          return;
        }
        await userService.createUser(formData);
        toast.success('New user created successfully!');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) return;

    try {
      const res = await userService.deleteUser(id);
      if (res.success) {
        toast.success('User removed.');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div>
          <h4 className="fw-bold text-dark brand-font mb-1">User & Staff Management</h4>
          <p className="text-muted small mb-0">Manage system administrators, billing staff, permissions, and credentials</p>
        </div>
        <button className="btn btn-primary-custom d-flex align-items-center gap-2" onClick={handleOpenCreate}>
          <i className="bi bi-person-plus-fill"></i>
          <span>Add New User / Staff</span>
        </button>
      </div>

      {/* Filter */}
      <div className="dashboard-card p-3 mb-4">
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <input
              type="text"
              className="form-control form-control-custom"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="col-12 col-md-6">
            <select
              className="form-select form-select-custom"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="staff">Staff</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="dashboard-card p-4">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Last Login</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border text-primary spinner-border-sm" role="status"></div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">No users found.</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="fw-bold text-dark">{u.name}</div>
                      <small className="text-muted">ID: #{u.id}</small>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'bg-primary' : 'bg-success'} text-uppercase font-monospace`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.phone || 'N/A'}</td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>
                      <small className="text-muted">{formatDateTime(u.last_login)}</small>
                    </td>
                    <td className="text-end text-nowrap">
                      <button
                        className="btn btn-sm btn-light border me-1"
                        title="Edit User"
                        onClick={() => handleOpenEdit(u)}
                      >
                        <i className="bi bi-pencil-square text-secondary"></i>
                      </button>
                      <button
                        className="btn btn-sm btn-light border text-danger"
                        title="Delete User"
                        onClick={() => handleDelete(u.id, u.name)}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination pagination={pagination} onPageChange={setPage} />
      </div>

      {/* User Form Modal */}
      {showModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-dark text-white p-3 px-4">
                <h5 className="modal-title fw-bold fs-6">
                  <i className={`bi ${editingUser ? 'bi-pencil-square' : 'bi-person-plus-fill'} text-primary me-2`}></i>
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Create New User Account'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold fs-7">Full Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold fs-7">Email Address <span className="text-danger">*</span></label>
                      <input
                        type="email"
                        className="form-control form-control-custom"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold fs-7">
                        {editingUser ? 'New Password (Leave blank to keep current)' : 'Password'} <span className={editingUser ? '' : 'text-danger'}>{editingUser ? '' : '*'}</span>
                      </label>
                      <input
                        type="password"
                        className="form-control form-control-custom"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!editingUser}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">Role <span className="text-danger">*</span></label>
                      <select
                        className="form-select form-select-custom"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      >
                        <option value="staff">Staff (Billing & Invoices)</option>
                        <option value="admin">Administrator (Full Access)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold fs-7">Status</label>
                      <select
                        className="form-select form-select-custom"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-semibold fs-7">Phone Number</label>
                      <input
                        type="text"
                        className="form-control form-control-custom"
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light p-3">
                  <button type="button" className="btn btn-secondary px-3" onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-custom px-4" disabled={submitting}>
                    {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
