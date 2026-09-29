const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const authMiddleware = require('../middleware/authMiddleware');
const { customerRules, validate } = require('../middleware/validator');

router.use(authMiddleware);

router.get('/', customerController.getCustomers);
router.get('/all', customerController.getAllCustomersSimple);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerRules, validate, customerController.createCustomer);
router.put('/:id', customerRules, validate, customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
