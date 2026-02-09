const test = require('node:test');
const assert = require('node:assert/strict');

const { parseBoolean, parseCsv, parsePositiveInt } = require('../src/utils/env');
const { normalizeOrigin } = require('../src/utils/origin');
const { parseJwtExpiresInToMs } = require('../src/utils/jwt');

test('parseCsv returns [] for undefined/null', () => {
    assert.deepEqual(parseCsv(undefined), []);
    assert.deepEqual(parseCsv(null), []);
});

test('parseCsv splits, trims, and filters empty items', () => {
    assert.deepEqual(parseCsv(' a,  b ,,c  '), ['a', 'b', 'c']);
});

test('normalizeOrigin returns empty string for empty-like values', () => {
    assert.equal(normalizeOrigin(''), '');
    assert.equal(normalizeOrigin('   '), '');
});

test('normalizeOrigin trims and removes trailing slash', () => {
    assert.equal(normalizeOrigin('https://spacegurumis.lat/'), 'https://spacegurumis.lat');
    assert.equal(normalizeOrigin('  https://example.com/  '), 'https://example.com');
    assert.equal(normalizeOrigin('https://example.com'), 'https://example.com');
});

test('parseBoolean recognizes truthy variants', () => {
    assert.equal(parseBoolean('true', false), true);
    assert.equal(parseBoolean('1', false), true);
    assert.equal(parseBoolean('YES', false), true);
    assert.equal(parseBoolean('on', false), true);
});

test('parseBoolean uses defaultValue for empty-ish inputs', () => {
    assert.equal(parseBoolean('', true), true);
    assert.equal(parseBoolean('   ', true), true);
    assert.equal(parseBoolean(undefined, true), true);
    assert.equal(parseBoolean(null, true), true);
});

test('parseBoolean returns false for non-truthy non-empty values', () => {
    assert.equal(parseBoolean('false', true), false);
    assert.equal(parseBoolean('no', true), false);
    assert.equal(parseBoolean('0', true), false);
});

test('parsePositiveInt returns fallback for invalid/<=0 values', () => {
    assert.equal(parsePositiveInt(undefined, 10), 10);
    assert.equal(parsePositiveInt(null, 10), 10);
    assert.equal(parsePositiveInt('0', 10), 10);
    assert.equal(parsePositiveInt('-5', 10), 10);
    assert.equal(parsePositiveInt('abc', 10), 10);
});

test('parsePositiveInt floors positive numbers', () => {
    assert.equal(parsePositiveInt('5', 10), 5);
    assert.equal(parsePositiveInt('3.9', 10), 3);
});

test('parseJwtExpiresInToMs returns null for empty/invalid values', () => {
    assert.equal(parseJwtExpiresInToMs(undefined), null);
    assert.equal(parseJwtExpiresInToMs(null), null);
    assert.equal(parseJwtExpiresInToMs(''), null);
    assert.equal(parseJwtExpiresInToMs('   '), null);
    assert.equal(parseJwtExpiresInToMs('abc'), null);
    assert.equal(parseJwtExpiresInToMs('5w'), null);
});

test('parseJwtExpiresInToMs supports numeric seconds and common units', () => {
    assert.equal(parseJwtExpiresInToMs('60'), 60 * 1000);
    assert.equal(parseJwtExpiresInToMs('0'), 0);
    assert.equal(parseJwtExpiresInToMs('15m'), 15 * 60 * 1000);
    assert.equal(parseJwtExpiresInToMs('7d'), 7 * 24 * 60 * 60 * 1000);
});

