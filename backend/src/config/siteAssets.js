const { parseCsv } = require('../utils/env');

const defaultAllowedSlots = [
    'home-hero',
    'home-banner',
];

const allowedSlots = parseCsv(process.env.SITE_ASSET_ALLOWED_SLOTS)
    .map((slot) => String(slot || '').trim().toLowerCase())
    .filter(Boolean);

module.exports = {
    allowedSlots: allowedSlots.length ? allowedSlots : defaultAllowedSlots,
};
