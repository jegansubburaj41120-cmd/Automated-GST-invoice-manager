const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', receiptController.getReceipts);
router.get('/:id', receiptController.getReceiptById);
router.post('/:id/regenerate-pdf', receiptController.regenerateReceiptPdf);

module.exports = router;
