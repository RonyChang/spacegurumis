const defaults = {
    PORT: '3000',
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/spacegurumis_test',
    JWT_SECRET: 'test-secret',
    CORS_ALLOWED_ORIGINS: 'http://localhost:4321,https://spacegurumis.lat',
    CSRF_ALLOWED_ORIGINS: 'http://localhost:4321,https://spacegurumis.lat',
    TRUST_PROXY: 'false',
};

for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
        process.env[key] = value;
    }
}
