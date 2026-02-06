const express = require('express');
const authRequired = require('../middlewares/authRequired');
const {
    getCart,
    addCartItem,
    updateCartItem,
    deleteCartItem,
    clearCart,
} = require('../controllers/cart.controller');

const router = express.Router();

router.get('/api/v1/cart', authRequired, getCart);
router.post('/api/v1/cart/items', authRequired, addCartItem);
router.patch('/api/v1/cart/items/:sku', authRequired, updateCartItem);
router.delete('/api/v1/cart/items/:sku', authRequired, deleteCartItem);
router.delete('/api/v1/cart', authRequired, clearCart);

module.exports = router;
