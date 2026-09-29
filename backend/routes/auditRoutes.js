const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(requireAdmin);

router.get('/', auditController.getAuditLogs);

module.exports = router;
