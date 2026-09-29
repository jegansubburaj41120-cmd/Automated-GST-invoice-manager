const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware');
const { productRules, validate } = require('../middleware/validator');

router.use(authMiddleware);

router.get('/', productController.getProducts);
router.get('/all', productController.getAllProductsSimple);
router.get('/:id', productController.getProductById);
router.post('/', productRules, validate, productController.createProduct);
router.put('/:id', productRules, validate, productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
