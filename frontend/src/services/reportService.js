import api from './api';

export const reportService = {
  getDashboardData: async () => {
    const res = await api.get('/reports/dashboard');
    return res.data;
  },
  getGstReport: async (params) => {
    const res = await api.get('/reports/gst', { params });
    return res.data;
  },
  getSalesReport: async (params) => {
    const res = await api.get('/reports/sales', { params });
    return res.data;
  },
  getOutstandingReport: async () => {
    const res = await api.get('/reports/outstanding');
    return res.data;
  }
};
