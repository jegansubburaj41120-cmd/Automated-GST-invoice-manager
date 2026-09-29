import api from './api';

export const invoiceService = {
  getInvoices: async (params) => {
    const res = await api.get('/invoices', { params });
    return res.data;
  },
  getInvoiceById: async (id) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
  },
  createInvoice: async (data) => {
    const res = await api.post('/invoices', data);
    return res.data;
  },
  regeneratePdf: async (id) => {
    const res = await api.post(`/invoices/${id}/regenerate-pdf`);
    return res.data;
  },
  deleteInvoice: async (id) => {
    const res = await api.delete(`/invoices/${id}`);
    return res.data;
  }
};
