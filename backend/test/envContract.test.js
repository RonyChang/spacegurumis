const test = require('node:test');
const assert = require('node:assert/strict');

const { buildRuntimeConfig, buildIntegrationConfig } = require('../src/config/envContract');

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
    assert.equal(config.passwordResetTtlMinutes, 30);
    assert.equal(config.passwordResetRequestCooldownSeconds, 60);
    assert.equal(config.passwordResetUrlPath, '/reset-password');
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

test('buildRuntimeConfig fails when PASSWORD_RESET_TTL_MINUTES is invalid', () => {
    const env = buildBaseEnv();
    env.PASSWORD_RESET_TTL_MINUTES = '0';

    assert.throws(
        () => buildRuntimeConfig(env),
        /PASSWORD_RESET_TTL_MINUTES: debe ser un entero positivo/
    );
});

test('buildRuntimeConfig fails when PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS is invalid', () => {
    const env = buildBaseEnv();
    env.PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS = '-1';

    assert.throws(
        () => buildRuntimeConfig(env),
        /PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS: debe ser un entero positivo/
    );
});

test('buildRuntimeConfig fails when PASSWORD_RESET_URL_PATH does not start with slash', () => {
    const env = buildBaseEnv();
    env.PASSWORD_RESET_URL_PATH = 'reset-password';

    assert.throws(
        () => buildRuntimeConfig(env),
        /PASSWORD_RESET_URL_PATH: debe empezar con "\/"/
    );
});

test('buildIntegrationConfig rejects partial image delivery config', () => {
    assert.throws(
        () => buildIntegrationConfig({
            IMAGE_DELIVERY_TRANSFORM_BASE_URL: 'https://img.spacegurumis.lat',
            IMAGE_DELIVERY_SOURCE_HOST: '',
        }),
        /IMAGE_DELIVERY_TRANSFORM_BASE_URL: define IMAGE_DELIVERY_TRANSFORM_BASE_URL y IMAGE_DELIVERY_SOURCE_HOST juntos/
    );
});

test('buildIntegrationConfig rejects signed mode without signing secret', () => {
    assert.throws(
        () => buildIntegrationConfig({
            IMAGE_DELIVERY_TRANSFORM_BASE_URL: 'https://img.spacegurumis.lat',
            IMAGE_DELIVERY_SOURCE_HOST: 'assets.spacegurumis.lat',
            IMAGE_DELIVERY_REQUIRE_SIGNED_URLS: 'true',
            IMAGE_DELIVERY_SIGNING_SECRET: '',
        }),
        /IMAGE_DELIVERY_SIGNING_SECRET: variable requerida/
    );
});

test('buildIntegrationConfig parses image delivery config when signed mode is disabled', () => {
    const config = buildIntegrationConfig({
        IMAGE_DELIVERY_TRANSFORM_BASE_URL: 'https://img.spacegurumis.lat/',
        IMAGE_DELIVERY_SOURCE_HOST: 'https://assets.spacegurumis.lat',
        IMAGE_DELIVERY_REQUIRE_SIGNED_URLS: 'false',
        IMAGE_DELIVERY_SIGNED_URL_TTL_SECONDS: '1200',
    });

    assert.deepEqual(config.imageDelivery, {
        transformBaseUrl: 'https://img.spacegurumis.lat',
        sourceHost: 'assets.spacegurumis.lat',
        requireSignedUrls: false,
        signingSecret: '',
        signedUrlTtlSeconds: 1200,
    });
});
