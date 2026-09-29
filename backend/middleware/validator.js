const { body, validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
}

const customerRules = [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('state_code').trim().isLength({ min: 2, max: 2 }).withMessage('State code must be 2 digits'),
  body('billing_address').trim().notEmpty().withMessage('Billing address is required'),
  body('gstin').optional({ checkFalsy: true }).matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid Indian GSTIN format')
];

const productRules = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('hsn_code').trim().notEmpty().withMessage('HSN/SAC code is required'),
  body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a non-negative number'),
  body('gst_rate').isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0% and 100%'),
  body('stock_quantity').optional().isInt({ min: 0 }).withMessage('Stock quantity cannot be negative')
];

const paymentRules = [
  body('invoice_id').isInt({ min: 1 }).withMessage('Valid invoice ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Payment amount must be greater than zero'),
  body('payment_method').isIn(['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other']).withMessage('Invalid payment method'),
  body('payment_date').notEmpty().withMessage('Payment date is required')
];

module.exports = {
  validate,
  customerRules,
  productRules,
  paymentRules
};
