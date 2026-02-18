const test = require('node:test');
const assert = require('node:assert/strict');

const r2Service = require('../src/services/r2.service');
const r2 = require('../src/config/r2');

test('buildImageKey uses variants/<variantId>/... and extension derived from contentType', () => {
    const key = r2Service.buildImageKey(123, 'image/png');
    assert.match(key, /^variants\/123\/[0-9a-f-]{36}\.png$/);
});

test('clampExpiresSeconds bounds to [60, 300] seconds', () => {
    assert.equal(r2Service.clampExpiresSeconds(1), 60);
    assert.equal(r2Service.clampExpiresSeconds(9999), 300);
    assert.equal(r2Service.clampExpiresSeconds('not-a-number'), 120);
});

test('presignPutObject clamps expires and sets X-Amz-Expires accordingly', () => {
    const presignedTooSmall = r2Service.presignPutObject({
        endpoint: 'https://example.r2.cloudflarestorage.com',
        bucket: 'bucket',
        key: 'variants/123/abc.png',
        accessKeyId: 'AKIDEXAMPLE',
        secretAccessKey: 'secret',
        region: 'auto',
        expiresInSeconds: 1,
        contentType: 'image/png',
        now: new Date('2026-01-01T00:00:00.000Z'),
    });

    assert.equal(presignedTooSmall.expiresInSeconds, 60);
    assert.equal(new URL(presignedTooSmall.uploadUrl).searchParams.get('X-Amz-Expires'), '60');

    const presignedTooLarge = r2Service.presignPutObject({
        endpoint: 'https://example.r2.cloudflarestorage.com',
        bucket: 'bucket',
        key: 'variants/123/abc.png',
        accessKeyId: 'AKIDEXAMPLE',
        secretAccessKey: 'secret',
        region: 'auto',
        expiresInSeconds: 9999,
        contentType: 'image/png',
        now: new Date('2026-01-01T00:00:00.000Z'),
    });

    assert.equal(presignedTooLarge.expiresInSeconds, 300);
    assert.equal(new URL(presignedTooLarge.uploadUrl).searchParams.get('X-Amz-Expires'), '300');
});

test('presignSiteAssetUpload uses site/<slot>/ prefix and expected expiration', () => {
    const original = {
        endpoint: r2.endpoint,
        bucket: r2.bucket,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        region: r2.region,
        publicBaseUrl: r2.publicBaseUrl,
        presignExpiresSeconds: r2.presignExpiresSeconds,
        allowedImageContentTypes: [...r2.allowedImageContentTypes],
        maxImageBytes: r2.maxImageBytes,
    };

    try {
        r2.endpoint = 'https://example.r2.cloudflarestorage.com';
        r2.bucket = 'spacegurumis';
        r2.accessKeyId = 'AKIDEXAMPLE';
        r2.secretAccessKey = 'secret';
        r2.region = 'auto';
        r2.publicBaseUrl = 'https://assets.spacegurumis.lat';
        r2.presignExpiresSeconds = 120;
        r2.allowedImageContentTypes = ['image/webp'];
        r2.maxImageBytes = 1024 * 1024;

        const presigned = r2Service.presignSiteAssetUpload({
            slot: 'home-hero',
            contentType: 'image/webp',
            byteSize: 2048,
        });

        assert.match(presigned.imageKey, /^site\/home-hero\/[0-9a-f-]{36}\.webp$/);
        assert.equal(presigned.publicUrl.startsWith('https://assets.spacegurumis.lat/site/home-hero/'), true);
        assert.equal(presigned.expiresInSeconds, 120);
        assert.equal(new URL(presigned.uploadUrl).searchParams.get('X-Amz-Expires'), '120');
        assert.equal(presigned.headers['Content-Type'], 'image/webp');
    } finally {
        r2.endpoint = original.endpoint;
        r2.bucket = original.bucket;
        r2.accessKeyId = original.accessKeyId;
        r2.secretAccessKey = original.secretAccessKey;
        r2.region = original.region;
        r2.publicBaseUrl = original.publicBaseUrl;
        r2.presignExpiresSeconds = original.presignExpiresSeconds;
        r2.allowedImageContentTypes = original.allowedImageContentTypes;
        r2.maxImageBytes = original.maxImageBytes;
    }
});

test('presignCatalogImageUpload fails fast when R2_PUBLIC_BASE_URL is missing', () => {
    const original = {
        endpoint: r2.endpoint,
        bucket: r2.bucket,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        region: r2.region,
        publicBaseUrl: r2.publicBaseUrl,
        presignExpiresSeconds: r2.presignExpiresSeconds,
        allowedImageContentTypes: [...r2.allowedImageContentTypes],
        maxImageBytes: r2.maxImageBytes,
    };

    try {
        r2.endpoint = 'https://example.r2.cloudflarestorage.com';
        r2.bucket = 'spacegurumis';
        r2.accessKeyId = 'AKIDEXAMPLE';
        r2.secretAccessKey = 'secret';
        r2.region = 'auto';
        r2.publicBaseUrl = '';
        r2.presignExpiresSeconds = 120;
        r2.allowedImageContentTypes = ['image/webp'];
        r2.maxImageBytes = 1024 * 1024;

        assert.throws(
            () => r2Service.presignCatalogImageUpload({
                scope: 'variant',
                entityId: 123,
                contentType: 'image/webp',
                byteSize: 2048,
            }),
            /R2_PUBLIC_BASE_URL no configurado/
        );
    } finally {
        r2.endpoint = original.endpoint;
        r2.bucket = original.bucket;
        r2.accessKeyId = original.accessKeyId;
        r2.secretAccessKey = original.secretAccessKey;
        r2.region = original.region;
        r2.publicBaseUrl = original.publicBaseUrl;
        r2.presignExpiresSeconds = original.presignExpiresSeconds;
        r2.allowedImageContentTypes = original.allowedImageContentTypes;
        r2.maxImageBytes = original.maxImageBytes;
    }
});
