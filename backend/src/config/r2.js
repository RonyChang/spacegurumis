const { parseCsv, parsePositiveInt } = require('../utils/env');

function normalizeBaseUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) {
        return '';
    }

    // Remove trailing slashes so URL building is consistent.
    return raw.replace(/\/+$/, '');
}

const accountId = String(process.env.R2_ACCOUNT_ID || '').trim();
const endpoint = normalizeBaseUrl(
    process.env.R2_ENDPOINT
        || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : '')
);
const region = String(process.env.R2_REGION || 'auto').trim() || 'auto';

const bucket = String(process.env.R2_BUCKET || '').trim();
const accessKeyId = String(process.env.R2_ACCESS_KEY_ID || '').trim();
const secretAccessKey = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();

const publicBaseUrl = normalizeBaseUrl(process.env.R2_PUBLIC_BASE_URL);

const presignExpiresSeconds = parsePositiveInt(process.env.R2_PRESIGN_EXPIRES_SECONDS, 120);
const maxImageBytes = parsePositiveInt(process.env.R2_MAX_IMAGE_BYTES, 5 * 1024 * 1024);

const defaultAllowedImageContentTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
];

const allowedImageContentTypes = (parseCsv(process.env.R2_ALLOWED_IMAGE_CONTENT_TYPES) || [])
    .map((item) => item.toLowerCase())
    .filter(Boolean);

module.exports = {
    accountId,
    endpoint,
    region,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicBaseUrl,
    presignExpiresSeconds,
    maxImageBytes,
    allowedImageContentTypes: allowedImageContentTypes.length
        ? allowedImageContentTypes
        : defaultAllowedImageContentTypes,
};

