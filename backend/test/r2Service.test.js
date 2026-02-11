const test = require('node:test');
const assert = require('node:assert/strict');

const r2Service = require('../src/services/r2.service');

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
