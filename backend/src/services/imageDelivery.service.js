const crypto = require('node:crypto');
const { integrations } = require('../config');

const IMAGE_DELIVERY_PRESETS = ['thumb', 'card', 'detail'];
const ALLOWED_SOURCE_PREFIXES = ['variants', 'products', 'categories', 'site'];

function normalizeHost(value) {
    try {
        const parsed = new URL(String(value || '').includes('://') ? String(value) : `https://${value}`);
        return parsed.host.toLowerCase().replace(/\.$/, '');
    } catch {
        return '';
    }
}

function normalizeTransformBase(value) {
    if (!value) {
        return null;
    }

    try {
        const parsed = new URL(String(value));
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }

        return new URL(`${parsed.toString().replace(/\/+$/, '')}/`);
    } catch {
        return null;
    }
}

function resolveConfig(configOverride) {
    const config = configOverride || integrations.imageDelivery || {};

    return {
        transformBase: normalizeTransformBase(config.transformBaseUrl),
        sourceHost: normalizeHost(config.sourceHost),
        requireSignedUrls: Boolean(config.requireSignedUrls),
        signingSecret: String(config.signingSecret || ''),
        signedUrlTtlSeconds: Number.isInteger(Number(config.signedUrlTtlSeconds))
            ? Math.max(1, Number(config.signedUrlTtlSeconds))
            : 900,
    };
}

function decodePathSegments(pathname) {
    const segments = String(pathname || '')
        .split('/')
        .filter(Boolean);

    if (!segments.length) {
        return null;
    }

    const decoded = [];
    for (const segment of segments) {
        let value = '';
        try {
            value = decodeURIComponent(segment);
        } catch {
            return null;
        }

        if (!value || value === '.' || value === '..') {
            return null;
        }

        if (value.includes('/') || value.includes('\\') || value.includes('\u0000')) {
            return null;
        }

        decoded.push(value);
    }

    return decoded;
}

function extractEligibleKey(sourceUrl, sourceHost) {
    if (!sourceUrl || !sourceHost) {
        return null;
    }

    let parsedSource;
    try {
        parsedSource = new URL(String(sourceUrl));
    } catch {
        return null;
    }

    if (parsedSource.protocol !== 'http:' && parsedSource.protocol !== 'https:') {
        return null;
    }

    if (normalizeHost(parsedSource.host) !== sourceHost) {
        return null;
    }

    const segments = decodePathSegments(parsedSource.pathname);
    if (!segments || !segments.length) {
        return null;
    }

    const prefix = String(segments[0] || '').toLowerCase();
    if (!ALLOWED_SOURCE_PREFIXES.includes(prefix)) {
        return null;
    }

    return segments.join('/');
}

function signPresetPath(path, expiresAt, secret) {
    return crypto
        .createHmac('sha256', secret)
        .update(`${path}:${expiresAt}`)
        .digest('hex');
}

function buildPresetUrlFromKey(preset, key, config, nowSeconds) {
    if (!IMAGE_DELIVERY_PRESETS.includes(preset)) {
        return null;
    }

    const url = new URL(`${preset}/${key}`, config.transformBase);

    if (!config.requireSignedUrls) {
        return url.toString();
    }

    if (!config.signingSecret) {
        return null;
    }

    const currentTime = Number.isFinite(Number(nowSeconds))
        ? Math.floor(Number(nowSeconds))
        : Math.floor(Date.now() / 1000);
    const expiresAt = currentTime + config.signedUrlTtlSeconds;
    const canonicalPath = `${preset}/${key}`;
    const signature = signPresetPath(canonicalPath, expiresAt, config.signingSecret);

    url.searchParams.set('exp', String(expiresAt));
    url.searchParams.set('sig', signature);
    return url.toString();
}

function buildImageDeliveryUrls(sourceUrl, options = {}) {
    const config = resolveConfig(options.config);
    if (!config.transformBase || !config.sourceHost) {
        return null;
    }

    const key = extractEligibleKey(sourceUrl, config.sourceHost);
    if (!key) {
        return null;
    }

    const urls = {
        thumb: buildPresetUrlFromKey('thumb', key, config, options.nowSeconds),
        card: buildPresetUrlFromKey('card', key, config, options.nowSeconds),
        detail: buildPresetUrlFromKey('detail', key, config, options.nowSeconds),
    };

    if (!urls.thumb && !urls.card && !urls.detail) {
        return null;
    }

    return urls;
}

function buildPresetImageDeliveryUrl(sourceUrl, preset, options = {}) {
    if (!IMAGE_DELIVERY_PRESETS.includes(String(preset))) {
        return null;
    }

    const urls = buildImageDeliveryUrls(sourceUrl, options);
    if (!urls) {
        return null;
    }

    return urls[preset] || null;
}

module.exports = {
    IMAGE_DELIVERY_PRESETS,
    ALLOWED_SOURCE_PREFIXES,
    buildImageDeliveryUrls,
    buildPresetImageDeliveryUrl,
    extractEligibleKey,
    signPresetPath,
};
