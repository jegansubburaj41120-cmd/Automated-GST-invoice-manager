import api from './api';

export const settingsService = {
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },
  updateSettings: async (data) => {
    const res = await api.put('/settings', data);
    return res.data;
  }
};

export const userService = {
  getUsers: async (params) => {
    const res = await api.get('/users', { params });
    return res.data;
  },
  createUser: async (data) => {
    const res = await api.post('/users', data);
    return res.data;
  },
  updateUser: async (id, data) => {
    const res = await api.put(`/users/${id}`, data);
    return res.data;
  },
  deleteUser: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  }
};

export const auditService = {
  getAuditLogs: async (params) => {
    const res = await api.get('/audit', { params });
    return res.data;
  }
};
