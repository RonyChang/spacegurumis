const express = require('express');
const authRequired = require('../middlewares/authRequired');
const csrfRequired = require('../middlewares/csrfRequired');
const {
    getCart,
    addCartItem,
    updateCartItem,
    deleteCartItem,
    clearCart,
} = require('../controllers/cart.controller');

const router = express.Router();

router.get('/api/v1/cart', authRequired, getCart);
router.post('/api/v1/cart/items', authRequired, csrfRequired, addCartItem);
router.patch('/api/v1/cart/items/:sku', authRequired, csrfRequired, updateCartItem);
router.delete('/api/v1/cart/items/:sku', authRequired, csrfRequired, deleteCartItem);
router.delete('/api/v1/cart', authRequired, csrfRequired, clearCart);

module.exports = router;
