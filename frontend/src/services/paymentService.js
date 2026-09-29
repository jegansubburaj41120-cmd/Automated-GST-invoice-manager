import api from './api';

export const paymentService = {
  getPayments: async (params) => {
    const res = await api.get('/payments', { params });
    return res.data;
  },
  recordPayment: async (data) => {
    const res = await api.post('/payments', data);
    return res.data;
  }
};
