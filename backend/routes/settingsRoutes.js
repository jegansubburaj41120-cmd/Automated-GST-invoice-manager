const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

router.get('/', settingsController.getSettings);
router.put('/', requireAdmin, settingsController.updateSettings);

module.exports = router;
