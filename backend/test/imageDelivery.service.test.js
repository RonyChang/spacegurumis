const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildImageDeliveryUrls,
    buildPresetImageDeliveryUrl,
    extractEligibleKey,
    signPresetPath,
} = require('../src/services/imageDelivery.service');

const unsignedConfig = {
    transformBaseUrl: 'https://img.spacegurumis.lat',
    sourceHost: 'assets.spacegurumis.lat',
    requireSignedUrls: false,
    signingSecret: '',
    signedUrlTtlSeconds: 900,
};

test('buildImageDeliveryUrls builds all fixed presets for eligible source URL', () => {
    const urls = buildImageDeliveryUrls('https://assets.spacegurumis.lat/variants/3/main.jpg', {
        config: unsignedConfig,
    });

    assert.deepEqual(urls, {
        thumb: 'https://img.spacegurumis.lat/thumb/variants/3/main.jpg',
        card: 'https://img.spacegurumis.lat/card/variants/3/main.jpg',
        detail: 'https://img.spacegurumis.lat/detail/variants/3/main.jpg',
    });
});

test('buildImageDeliveryUrls returns null for ineligible source host', () => {
    const urls = buildImageDeliveryUrls('https://cdn.example.com/variants/3/main.jpg', {
        config: unsignedConfig,
    });

    assert.equal(urls, null);
});

test('buildImageDeliveryUrls appends exp and sig when signed mode is enabled', () => {
    const signedConfig = {
        ...unsignedConfig,
        requireSignedUrls: true,
        signingSecret: 'top-secret-key',
        signedUrlTtlSeconds: 300,
    };

    const urls = buildImageDeliveryUrls('https://assets.spacegurumis.lat/variants/7/image.webp', {
        config: signedConfig,
        nowSeconds: 1000,
    });

    assert.ok(urls);
    const detail = new URL(urls.detail);
    assert.equal(detail.searchParams.get('exp'), '1300');
    const expectedSig = signPresetPath('detail/variants/7/image.webp', 1300, 'top-secret-key');
    assert.equal(detail.searchParams.get('sig'), expectedSig);
});

test('buildPresetImageDeliveryUrl rejects unsupported preset', () => {
    const url = buildPresetImageDeliveryUrl('https://assets.spacegurumis.lat/variants/3/main.jpg', 'hero', {
        config: unsignedConfig,
    });

    assert.equal(url, null);
});

test('extractEligibleKey rejects traversal in encoded path segments', () => {
    const key = extractEligibleKey(
        'https://assets.spacegurumis.lat/variants/%2E%2E/secret.jpg',
        'assets.spacegurumis.lat'
    );

    assert.equal(key, null);
});
