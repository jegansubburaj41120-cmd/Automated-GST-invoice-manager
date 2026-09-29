const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');
const { paymentRules, validate } = require('../middleware/validator');

router.use(authMiddleware);

router.get('/', paymentController.getPayments);
router.post('/', paymentRules, validate, paymentController.recordPayment);

module.exports = router;
