const parsedPort = process.env.PORT ? Number(process.env.PORT) : NaN;
const port = Number.isNaN(parsedPort) ? 3000 : parsedPort;
const nodeEnv = process.env.NODE_ENV || 'development';

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null) {
        return defaultValue;
    }

    const normalized = String(value).trim().toLowerCase();
    if (!normalized) {
        return defaultValue;
    }

    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

const trustProxy = parseBoolean(process.env.TRUST_PROXY, false);

module.exports = {
    port,
    nodeEnv,
    trustProxy,
};
