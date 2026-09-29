const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/dashboard', reportController.getDashboardData);
router.get('/gst', reportController.getGstReport);
router.get('/sales', reportController.getSalesReport);
router.get('/outstanding', reportController.getOutstandingReport);

module.exports = router;
