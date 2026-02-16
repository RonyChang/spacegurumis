const Stripe = require('stripe');
const { integrations } = require('./index');

const secretKey = integrations.stripe.secretKey;
const successUrl = integrations.stripe.successUrl;
const cancelUrl = integrations.stripe.cancelUrl;

const stripe = secretKey ? new Stripe(secretKey) : null;

module.exports = {
    stripe,
    successUrl,
    cancelUrl,
};
