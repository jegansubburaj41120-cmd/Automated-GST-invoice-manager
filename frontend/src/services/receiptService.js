import api from './api';

export const receiptService = {
  getReceipts: async (params) => {
    const res = await api.get('/receipts', { params });
    return res.data;
  },
  getReceiptById: async (id) => {
    const res = await api.get(`/receipts/${id}`);
    return res.data;
  },
  regeneratePdf: async (id) => {
    const res = await api.post(`/receipts/${id}/regenerate-pdf`);
    return res.data;
  }
};
