const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRuntimeConfig } = require('../src/config/envContract');

function buildBaseEnv() {
    return {
        PORT: '3000',
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/spacegurumis_test',
        JWT_SECRET: 'test-secret',
        CORS_ALLOWED_ORIGINS: 'http://localhost:4321,https://spacegurumis.lat',
        CSRF_ALLOWED_ORIGINS: 'http://localhost:4321,https://spacegurumis.lat',
        FRONTEND_BASE_URL: 'https://spacegurumis.lat',
    };
}

test('buildRuntimeConfig returns normalized config for valid env', () => {
    const env = buildBaseEnv();
    const config = buildRuntimeConfig(env);

    assert.equal(config.port, 3000);
    assert.equal(config.nodeEnv, 'test');
    assert.equal(config.databaseUrl, env.DATABASE_URL);
    assert.equal(config.jwtSecret, env.JWT_SECRET);
    assert.deepEqual(config.corsAllowedOrigins, ['http://localhost:4321', 'https://spacegurumis.lat']);
    assert.deepEqual(config.csrfAllowedOrigins, ['http://localhost:4321', 'https://spacegurumis.lat']);
    assert.equal(config.frontendBaseUrl, 'https://spacegurumis.lat');
});

test('buildRuntimeConfig fails when a required variable is missing', () => {
    const env = buildBaseEnv();
    delete env.JWT_SECRET;

    assert.throws(
        () => buildRuntimeConfig(env),
        /JWT_SECRET: variable requerida/
    );
});

test('buildRuntimeConfig fails when PORT is invalid', () => {
    const env = buildBaseEnv();
    env.PORT = 'abc';

    assert.throws(
        () => buildRuntimeConfig(env),
        /PORT: debe ser un entero/
    );
});

test('buildRuntimeConfig fails when DATABASE_URL protocol is invalid', () => {
    const env = buildBaseEnv();
    env.DATABASE_URL = 'mysql://localhost/test';

    assert.throws(
        () => buildRuntimeConfig(env),
        /DATABASE_URL: debe usar protocolo postgres/
    );
});

test('buildRuntimeConfig fails when CORS origin includes path', () => {
    const env = buildBaseEnv();
    env.CORS_ALLOWED_ORIGINS = 'https://spacegurumis.lat/path';

    assert.throws(
        () => buildRuntimeConfig(env),
        /CORS_ALLOWED_ORIGINS: origin invalido/
    );
});

test('buildRuntimeConfig fails when CORS_ALLOWED_ORIGINS is empty', () => {
    const env = buildBaseEnv();
    env.CORS_ALLOWED_ORIGINS = '';

    assert.throws(
        () => buildRuntimeConfig(env),
        /CORS_ALLOWED_ORIGINS:/
    );
});

test('buildRuntimeConfig fails when CSRF_ALLOWED_ORIGINS is empty', () => {
    const env = buildBaseEnv();
    env.CSRF_ALLOWED_ORIGINS = '';

    assert.throws(
        () => buildRuntimeConfig(env),
        /CSRF_ALLOWED_ORIGINS:/
    );
});

test('buildRuntimeConfig fails when FRONTEND_BASE_URL is malformed', () => {
    const env = buildBaseEnv();
    env.FRONTEND_BASE_URL = 'not-a-url';

    assert.throws(
        () => buildRuntimeConfig(env),
        /FRONTEND_BASE_URL: URL invalida/
    );
});
