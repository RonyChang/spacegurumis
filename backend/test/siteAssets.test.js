const test = require('node:test');
const assert = require('node:assert/strict');

const adminRoutes = require('../src/routes/admin.routes');
const siteAssetsRoutes = require('../src/routes/siteAssets.routes');
const siteAssetsController = require('../src/controllers/siteAssets.controller');
const siteAssetsService = require('../src/services/siteAssets.service');
const siteAssetsRepository = require('../src/repositories/siteAssets.repository');
const r2Service = require('../src/services/r2.service');
const r2 = require('../src/config/r2');

function makeRes() {
    return {
        statusCode: 200,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(value) {
            this.payload = value;
            return this;
        },
    };
}

function findRoute(router, path, method) {
    const m = String(method || '').toLowerCase();
    const layer = (router.stack || []).find((item) => item
        && item.route
        && item.route.path === path
        && item.route.methods
        && item.route.methods[m]);
    return layer ? layer.route : null;
}

function routeMiddlewareNames(route) {
    const stack = route && Array.isArray(route.stack) ? route.stack : [];
    return stack
        .map((layer) => layer && layer.handle && layer.handle.name)
        .filter(Boolean);
}

test('site asset routes include admin middleware and public slot endpoint', () => {
    const presign = findRoute(adminRoutes, '/api/v1/admin/site-assets/presign', 'post');
    assert.ok(presign, 'presign route exists');
    const presignNames = routeMiddlewareNames(presign);
    assert.ok(presignNames.includes('authRequired'));
    assert.ok(presignNames.includes('csrfRequired'));
    assert.ok(presignNames.includes('adminRequired'));

    const register = findRoute(adminRoutes, '/api/v1/admin/site-assets', 'post');
    assert.ok(register, 'register route exists');
    const registerNames = routeMiddlewareNames(register);
    assert.ok(registerNames.includes('authRequired'));
    assert.ok(registerNames.includes('csrfRequired'));
    assert.ok(registerNames.includes('adminRequired'));

    const list = findRoute(adminRoutes, '/api/v1/admin/site-assets', 'get');
    assert.ok(list, 'list route exists');
    const listNames = routeMiddlewareNames(list);
    assert.ok(listNames.includes('authRequired'));
    assert.ok(listNames.includes('adminRequired'));
    assert.equal(listNames.includes('csrfRequired'), false);

    const update = findRoute(adminRoutes, '/api/v1/admin/site-assets/:id', 'patch');
    assert.ok(update, 'update route exists');
    const updateNames = routeMiddlewareNames(update);
    assert.ok(updateNames.includes('authRequired'));
    assert.ok(updateNames.includes('csrfRequired'));
    assert.ok(updateNames.includes('adminRequired'));

    const remove = findRoute(adminRoutes, '/api/v1/admin/site-assets/:id', 'delete');
    assert.ok(remove, 'remove route exists');
    const removeNames = routeMiddlewareNames(remove);
    assert.ok(removeNames.includes('authRequired'));
    assert.ok(removeNames.includes('csrfRequired'));
    assert.ok(removeNames.includes('adminRequired'));

    const publicSlot = findRoute(siteAssetsRoutes, '/api/v1/site-assets/:slot', 'get');
    assert.ok(publicSlot, 'public slot route exists');
});

test('registerSiteAsset rejects missing R2 object and does not persist', async () => {
    const originalHead = r2Service.headPublicObject;
    const originalCreate = siteAssetsRepository.createSiteAsset;
    const originalPublicBaseUrl = r2.publicBaseUrl;
    let createCalls = 0;

    try {
        r2.publicBaseUrl = 'https://assets.example.com';
        r2Service.headPublicObject = async () => ({ exists: false, status: 404 });
        siteAssetsRepository.createSiteAsset = async (data) => {
            createCalls += 1;
            return data;
        };

        const result = await siteAssetsService.registerSiteAsset({
            slot: 'home-hero',
            imageKey: 'site/home-hero/missing.webp',
            contentType: 'image/webp',
            byteSize: 123,
        });

        assert.equal(result.error, 'bad_request');
        assert.match(String(result.message || ''), /no existe en r2/i);
        assert.equal(createCalls, 0);
    } finally {
        r2Service.headPublicObject = originalHead;
        siteAssetsRepository.createSiteAsset = originalCreate;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});

test('registerSiteAsset stores derived publicUrl and metadata', async () => {
    const originalHead = r2Service.headPublicObject;
    const originalCreate = siteAssetsRepository.createSiteAsset;
    const originalPublicBaseUrl = r2.publicBaseUrl;
    const captured = { created: null };

    try {
        r2.publicBaseUrl = 'https://assets.example.com';
        r2Service.headPublicObject = async () => ({
            exists: true,
            status: 200,
            contentType: 'image/webp',
            byteSize: 123,
        });
        siteAssetsRepository.createSiteAsset = async (data) => {
            captured.created = data;
            return { id: 9, ...data };
        };

        const result = await siteAssetsService.registerSiteAsset({
            slot: 'home-hero',
            title: 'Hero',
            altText: 'Hero alt',
            imageKey: 'site/home-hero/asset.webp',
            contentType: 'image/webp',
            byteSize: 123,
            sortOrder: 2,
            isActive: true,
        });

        assert.equal(result.error, undefined);
        assert.ok(result.data);
        assert.equal(result.data.publicUrl, 'https://assets.example.com/site/home-hero/asset.webp');
        assert.ok(captured.created);
        assert.equal(captured.created.slot, 'home-hero');
        assert.equal(captured.created.title, 'Hero');
        assert.equal(captured.created.altText, 'Hero alt');
        assert.equal(captured.created.sortOrder, 2);
    } finally {
        r2Service.headPublicObject = originalHead;
        siteAssetsRepository.createSiteAsset = originalCreate;
        r2.publicBaseUrl = originalPublicBaseUrl;
    }
});

test('site asset service list/update/delete preserves metadata and removes rows', async () => {
    const originalList = siteAssetsRepository.listSiteAssets;
    const originalFindById = siteAssetsRepository.findSiteAssetById;
    const originalUpdate = siteAssetsRepository.updateSiteAsset;
    const originalDelete = siteAssetsRepository.deleteSiteAsset;

    const rows = [
        { id: 11, slot: 'home-hero', title: 'B', altText: 'B alt', sortOrder: 1, isActive: true },
        { id: 10, slot: 'home-hero', title: 'A', altText: 'A alt', sortOrder: 1, isActive: true },
        { id: 9, slot: 'home-hero', title: 'C', altText: 'C alt', sortOrder: 0, isActive: true },
    ];

    function ordered() {
        return rows
            .slice()
            .sort((a, b) => (a.sortOrder - b.sortOrder) || (a.id - b.id))
            .map((item) => ({ ...item }));
    }

    try {
        siteAssetsRepository.listSiteAssets = async () => ordered();
        siteAssetsRepository.findSiteAssetById = async (id) => rows.find((item) => item.id === id) || null;
        siteAssetsRepository.updateSiteAsset = async (id, patch) => {
            const index = rows.findIndex((item) => item.id === id);
            if (index < 0) {
                return null;
            }
            rows[index] = { ...rows[index], ...patch };
            return { ...rows[index] };
        };
        siteAssetsRepository.deleteSiteAsset = async (id) => {
            const index = rows.findIndex((item) => item.id === id);
            if (index < 0) {
                return false;
            }
            rows.splice(index, 1);
            return true;
        };

        const before = await siteAssetsService.listSiteAssets({ slot: 'home-hero' });
        assert.deepEqual(before.data.map((item) => item.id), [9, 10, 11]);
        assert.equal(before.data.find((item) => item.id === 10).altText, 'A alt');

        const updated = await siteAssetsService.updateSiteAsset(10, { altText: 'Actualizado', sortOrder: 3 });
        assert.equal(updated.error, undefined);
        assert.equal(updated.data.altText, 'Actualizado');
        assert.equal(updated.data.sortOrder, 3);

        const removed = await siteAssetsService.removeSiteAsset(10);
        assert.equal(removed.error, undefined);
        assert.deepEqual(removed.data, { deleted: true });

        const after = await siteAssetsService.listSiteAssets({ slot: 'home-hero' });
        assert.deepEqual(after.data.map((item) => item.id), [9, 11]);
    } finally {
        siteAssetsRepository.listSiteAssets = originalList;
        siteAssetsRepository.findSiteAssetById = originalFindById;
        siteAssetsRepository.updateSiteAsset = originalUpdate;
        siteAssetsRepository.deleteSiteAsset = originalDelete;
    }
});

test('public site-assets endpoint returns ordered data and empty list', async () => {
    const originalListPublic = siteAssetsService.listPublicSiteAssets;

    try {
        siteAssetsService.listPublicSiteAssets = async (slot) => {
            if (slot === 'home-hero') {
                return {
                    data: [
                        {
                            id: 2,
                            slot,
                            title: 'Hero 1',
                            altText: 'Hero 1 alt',
                            publicUrl: 'https://assets.spacegurumis.lat/site/home-hero/2.webp',
                            sortOrder: 0,
                        },
                        {
                            id: 3,
                            slot,
                            title: 'Hero 2',
                            altText: 'Hero 2 alt',
                            publicUrl: 'https://assets.spacegurumis.lat/site/home-hero/3.webp',
                            sortOrder: 1,
                        },
                    ],
                };
            }
            return { data: [] };
        };

        const next = () => {
            throw new Error('next should not be called');
        };

        const withDataRes = makeRes();
        await siteAssetsController.listBySlot({ params: { slot: 'home-hero' } }, withDataRes, next);
        assert.equal(withDataRes.statusCode, 200);
        assert.equal(withDataRes.payload.meta.total, 2);
        assert.deepEqual(withDataRes.payload.data.map((item) => item.sortOrder), [0, 1]);

        const emptyRes = makeRes();
        await siteAssetsController.listBySlot({ params: { slot: 'home-banner' } }, emptyRes, next);
        assert.equal(emptyRes.statusCode, 200);
        assert.equal(Array.isArray(emptyRes.payload.data), true);
        assert.equal(emptyRes.payload.data.length, 0);
    } finally {
        siteAssetsService.listPublicSiteAssets = originalListPublic;
    }
});
