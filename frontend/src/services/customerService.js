import api from './api';

export const customerService = {
  getCustomers: async (params) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },
  getAllSimple: async () => {
    const res = await api.get('/customers/all');
    return res.data;
  },
  getCustomerById: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
  },
  createCustomer: async (data) => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  updateCustomer: async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  deleteCustomer: async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  }
};
