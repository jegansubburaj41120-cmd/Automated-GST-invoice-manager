const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceController.createInvoice);
router.post('/:id/regenerate-pdf', invoiceController.regenerateInvoicePdf);
router.delete('/:id', requireAdmin, invoiceController.deleteInvoice);

module.exports = router;
