const Stripe = require('stripe');

const secretKey = process.env.STRIPE_SECRET_KEY || '';
const successUrl = process.env.STRIPE_SUCCESS_URL || '';
const cancelUrl = process.env.STRIPE_CANCEL_URL || '';

const stripe = secretKey ? new Stripe(secretKey) : null;

module.exports = {
    stripe,
    successUrl,
    cancelUrl,
};
