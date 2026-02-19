const test = require('node:test');
const assert = require('node:assert/strict');

const catalogController = require('../src/controllers/catalog.controller');
const catalogService = require('../src/services/catalog.service');

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

test('catalog.controller.listVariants parses minPrice/maxPrice from soles to cents', async () => {
    const originalListVariants = catalogService.listVariants;
    let capturedFilters = null;
    let capturedOptions = null;
    let capturedFlags = null;

    try {
        catalogService.listVariants = async (filters, options, flags) => {
            capturedFilters = filters;
            capturedOptions = options;
            capturedFlags = flags;
            return {
                items: [],
                meta: { total: 0, page: 1, pageSize: 12, totalPages: 0 },
            };
        };

        const req = {
            query: {
                minPrice: '10',
                maxPrice: '30',
                includeFacets: 'true',
                includeHighlights: 'true',
            },
        };
        const res = makeRes();
        const next = () => {
            throw new Error('next should not be called');
        };

        await catalogController.listVariants(req, res, next);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(capturedFilters, {
            category: null,
            product: null,
            q: null,
            minPrice: 1000,
            maxPrice: 3000,
        });
        assert.deepEqual(capturedOptions, { page: 1, pageSize: 12 });
        assert.deepEqual(capturedFlags, { includeFacets: true, includeHighlights: true });
    } finally {
        catalogService.listVariants = originalListVariants;
    }
});
