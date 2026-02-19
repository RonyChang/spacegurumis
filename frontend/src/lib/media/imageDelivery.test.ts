import { afterEach, describe, expect, test, vi } from 'vitest';

async function loadBuilder(overrides: {
    imageTransformBaseUrl?: string;
    imageSourceHost?: string;
} = {}) {
    vi.resetModules();
    vi.doMock('../config', () => ({
        publicConfig: {
            apiBaseUrl: '',
            imageTransformBaseUrl: overrides.imageTransformBaseUrl ?? 'https://img.spacegurumis.lat',
            imageSourceHost: overrides.imageSourceHost ?? 'assets.spacegurumis.lat',
            whatsappNumber: '',
            whatsappTemplate: '',
            whatsappOrderTemplate: '',
        },
    }));

    const mod = await import('./imageDelivery');
    return mod.buildCatalogImageDeliveryUrl;
}

afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../config');
});

describe('buildCatalogImageDeliveryUrl', () => {
    test('builds transformed URL for detail preset when URL is eligible', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder();

        expect(
            buildCatalogImageDeliveryUrl(
                'https://assets.spacegurumis.lat/variants/ALI-ESP-001/main.webp',
                'detail'
            )
        ).toBe('https://img.spacegurumis.lat/detail/variants/ALI-ESP-001/main.webp');
    });

    test('builds transformed URL for thumb preset when URL is eligible', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder();

        expect(
            buildCatalogImageDeliveryUrl(
                'https://assets.spacegurumis.lat/products/aliens/base.webp',
                'thumb'
            )
        ).toBe('https://img.spacegurumis.lat/thumb/products/aliens/base.webp');
    });

    test('builds transformed URL for card preset when URL is eligible', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder();

        expect(
            buildCatalogImageDeliveryUrl(
                'https://assets.spacegurumis.lat/categories/aliens/cover.webp',
                'card'
            )
        ).toBe('https://img.spacegurumis.lat/card/categories/aliens/cover.webp');
    });

    test('returns original URL when transform config is missing', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder({ imageTransformBaseUrl: '' });
        const original = 'https://assets.spacegurumis.lat/variants/ALI-ESP-001/main.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'detail')).toBe(original);
    });

    test('returns original URL when source host config is missing', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder({ imageSourceHost: '' });
        const original = 'https://assets.spacegurumis.lat/variants/ALI-ESP-001/main.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'detail')).toBe(original);
    });

    test('returns original URL when transform base config is malformed', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder({ imageTransformBaseUrl: 'not-a-valid-url' });
        const original = 'https://assets.spacegurumis.lat/variants/ALI-ESP-001/main.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'detail')).toBe(original);
    });

    test('returns original URL when source host config is malformed', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder({ imageSourceHost: '@@bad-host@@' });
        const original = 'https://assets.spacegurumis.lat/variants/ALI-ESP-001/main.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'detail')).toBe(original);
    });

    test('returns original URL when source host does not match allowlist', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder();
        const original = 'https://cdn.example.com/variants/ALI-ESP-001/main.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'detail')).toBe(original);
    });

    test('returns original URL when source protocol is not http/https', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder();
        const original = 'ftp://assets.spacegurumis.lat/variants/ALI-ESP-001/main.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'detail')).toBe(original);
    });

    test('returns original URL when path prefix is not allowlisted', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder();
        const original = 'https://assets.spacegurumis.lat/uploads/ALI-ESP-001/main.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'detail')).toBe(original);
    });

    test('returns original URL when path contains traversal segments', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder();
        const original = 'https://assets.spacegurumis.lat/variants/%2E%2E/secrets.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'detail')).toBe(original);
    });

    test('returns original URL when preset is unsupported', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder();
        const original = 'https://assets.spacegurumis.lat/variants/ALI-ESP-001/main.webp';

        expect(buildCatalogImageDeliveryUrl(original, 'hero')).toBe(original);
    });

    test('accepts source host config even when provided as URL', async () => {
        const buildCatalogImageDeliveryUrl = await loadBuilder({
            imageSourceHost: 'https://assets.spacegurumis.lat',
        });

        expect(
            buildCatalogImageDeliveryUrl(
                'https://assets.spacegurumis.lat/site/home/hero.webp',
                'detail'
            )
        ).toBe('https://img.spacegurumis.lat/detail/site/home/hero.webp');
    });
});
