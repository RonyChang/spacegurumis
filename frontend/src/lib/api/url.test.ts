import { afterEach, describe, expect, test, vi } from 'vitest';

async function loadBuildApiUrl(apiBaseUrl: string) {
    vi.resetModules();
    vi.doMock('../config', () => ({
        publicConfig: {
            apiBaseUrl,
            whatsappNumber: '',
            whatsappTemplate: '',
            whatsappOrderTemplate: '',
        },
    }));

    const mod = await import('./url');
    return mod.buildApiUrl;
}

afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../config');
});

describe('buildApiUrl', () => {
    test('returns same-origin relative path when PUBLIC_API_BASE_URL is empty', async () => {
        const buildApiUrl = await loadBuildApiUrl('');
        expect(buildApiUrl('/api/v1/catalog/variants')).toBe('/api/v1/catalog/variants');
    });

    test('returns absolute URL when PUBLIC_API_BASE_URL is configured', async () => {
        const buildApiUrl = await loadBuildApiUrl('https://api.spacegurumis.lat');
        expect(buildApiUrl('/api/v1/catalog/variants')).toBe(
            'https://api.spacegurumis.lat/api/v1/catalog/variants'
        );
    });

    test('supports same-origin admin upload routes when PUBLIC_API_BASE_URL is empty', async () => {
        const buildApiUrl = await loadBuildApiUrl('');
        expect(buildApiUrl('/api/v1/admin/variants/300/images/presign')).toBe(
            '/api/v1/admin/variants/300/images/presign'
        );
    });

    test('supports absolute admin upload routes when PUBLIC_API_BASE_URL is configured', async () => {
        const buildApiUrl = await loadBuildApiUrl('https://api.spacegurumis.lat');
        expect(buildApiUrl('/api/v1/admin/variants/300/images/presign')).toBe(
            'https://api.spacegurumis.lat/api/v1/admin/variants/300/images/presign'
        );
    });

    test('throws when path is empty', async () => {
        const buildApiUrl = await loadBuildApiUrl('');
        expect(() => buildApiUrl('')).toThrowError('API path is required');
    });

    test('throws when path does not start with slash', async () => {
        const buildApiUrl = await loadBuildApiUrl('');
        expect(() => buildApiUrl('api/v1/catalog/variants')).toThrowError(
            'API path must start with "/"'
        );
    });
});
