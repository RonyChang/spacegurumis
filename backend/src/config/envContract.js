const { parseCsv, parsePositiveInt } = require('../utils/env');
const { normalizeOrigin } = require('../utils/origin');

const NODE_ENV_VALUES = new Set(['development', 'test', 'production']);
const HTTP_PROTOCOLS = new Set(['http:', 'https:']);
const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const DEFAULT_R2_ALLOWED_IMAGE_CONTENT_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
];

function createEnvError(variableName, message) {
    const error = new Error(`[ENV] ${variableName}: ${message}`);
    error.name = 'EnvValidationError';
    return error;
}

function readRequired(rawEnv, variableName) {
    const value = String(rawEnv[variableName] || '').trim();
    if (!value) {
        throw createEnvError(variableName, 'variable requerida');
    }

    return value;
}

function readOptional(rawEnv, variableName, fallback = '') {
    const rawValue = rawEnv[variableName];
    const value = String(rawValue === undefined || rawValue === null ? '' : rawValue).trim();
    return value || fallback;
}

function parseRequiredNodeEnv(rawEnv) {
    const nodeEnv = readRequired(rawEnv, 'NODE_ENV').toLowerCase();
    if (!NODE_ENV_VALUES.has(nodeEnv)) {
        throw createEnvError('NODE_ENV', 'valor invalido (usa development, test o production)');
    }

    return nodeEnv;
}

function parseRequiredPort(rawEnv) {
    const rawPort = readRequired(rawEnv, 'PORT');
    const port = Number(rawPort);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw createEnvError('PORT', 'debe ser un entero entre 1 y 65535');
    }

    return port;
}

function parseRequiredDatabaseUrl(rawEnv) {
    const value = readRequired(rawEnv, 'DATABASE_URL');
    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        throw createEnvError('DATABASE_URL', 'URL invalida');
    }

    if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
        throw createEnvError('DATABASE_URL', 'debe usar protocolo postgres:// o postgresql://');
    }

    return value;
}

function parseOptionalFrontendBaseUrl(rawEnv) {
    const value = readOptional(rawEnv, 'FRONTEND_BASE_URL', '');
    if (!value) {
        return null;
    }

    let parsed;
    try {
        parsed = new URL(value);
    } catch {
        throw createEnvError('FRONTEND_BASE_URL', 'URL invalida');
    }

    if (!HTTP_PROTOCOLS.has(parsed.protocol)) {
        throw createEnvError('FRONTEND_BASE_URL', 'debe usar protocolo http:// o https://');
    }

    return normalizeOrigin(value);
}

function parseOptionalPositiveInt(rawEnv, variableName, fallback) {
    const rawValue = readOptional(rawEnv, variableName, '');
    if (!rawValue) {
        return fallback;
    }

    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw createEnvError(variableName, 'debe ser un entero positivo');
    }

    return parsed;
}

function parseOptionalResetPath(rawEnv) {
    const resetPath = readOptional(rawEnv, 'PASSWORD_RESET_URL_PATH', '/reset-password');
    if (!resetPath.startsWith('/')) {
        throw createEnvError('PASSWORD_RESET_URL_PATH', 'debe empezar con "/"');
    }

    return resetPath;
}

function normalizeBaseUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) {
        return '';
    }

    return raw.replace(/\/+$/, '');
}

function parseRequiredOrigins(rawEnv, variableName) {
    const values = parseCsv(readRequired(rawEnv, variableName))
        .map(normalizeOrigin)
        .filter(Boolean);
    if (!values.length) {
        throw createEnvError(variableName, 'debe contener al menos un origin');
    }

    const uniqueOrigins = new Set();
    for (const value of values) {
        let parsed;
        try {
            parsed = new URL(value);
        } catch {
            throw createEnvError(variableName, `origin invalido: ${value}`);
        }

        if (!HTTP_PROTOCOLS.has(parsed.protocol)) {
            throw createEnvError(variableName, `origin invalido (solo http/https): ${value}`);
        }

        const normalizedOrigin = normalizeOrigin(parsed.origin);
        if (normalizedOrigin !== value) {
            throw createEnvError(
                variableName,
                `origin invalido (sin path/query/hash, sin slash final): ${value}`
            );
        }
        uniqueOrigins.add(normalizedOrigin);
    }

    return Array.from(uniqueOrigins);
}

function buildRuntimeConfig(rawEnv = process.env) {
    return {
        nodeEnv: parseRequiredNodeEnv(rawEnv),
        port: parseRequiredPort(rawEnv),
        databaseUrl: parseRequiredDatabaseUrl(rawEnv),
        jwtSecret: readRequired(rawEnv, 'JWT_SECRET'),
        frontendBaseUrl: parseOptionalFrontendBaseUrl(rawEnv),
        passwordResetTtlMinutes: parseOptionalPositiveInt(rawEnv, 'PASSWORD_RESET_TTL_MINUTES', 30),
        passwordResetRequestCooldownSeconds: parseOptionalPositiveInt(
            rawEnv,
            'PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS',
            60
        ),
        passwordResetUrlPath: parseOptionalResetPath(rawEnv),
        corsAllowedOrigins: parseRequiredOrigins(rawEnv, 'CORS_ALLOWED_ORIGINS'),
        csrfAllowedOrigins: parseRequiredOrigins(rawEnv, 'CSRF_ALLOWED_ORIGINS'),
    };
}

function buildIntegrationConfig(rawEnv = process.env) {
    const stripe = {
        secretKey: readOptional(rawEnv, 'STRIPE_SECRET_KEY', ''),
        successUrl: readOptional(rawEnv, 'STRIPE_SUCCESS_URL', ''),
        cancelUrl: readOptional(rawEnv, 'STRIPE_CANCEL_URL', ''),
    };

    const r2AccountId = readOptional(rawEnv, 'R2_ACCOUNT_ID', '');
    const r2Endpoint = normalizeBaseUrl(
        readOptional(rawEnv, 'R2_ENDPOINT', '')
            || (r2AccountId ? `https://${r2AccountId}.r2.cloudflarestorage.com` : '')
    );
    const r2AllowedContentTypes = parseCsv(readOptional(rawEnv, 'R2_ALLOWED_IMAGE_CONTENT_TYPES', ''))
        .map((item) => item.toLowerCase())
        .filter(Boolean);

    const r2 = {
        accountId: r2AccountId,
        endpoint: r2Endpoint,
        region: readOptional(rawEnv, 'R2_REGION', 'auto'),
        bucket: readOptional(rawEnv, 'R2_BUCKET', ''),
        accessKeyId: readOptional(rawEnv, 'R2_ACCESS_KEY_ID', ''),
        secretAccessKey: readOptional(rawEnv, 'R2_SECRET_ACCESS_KEY', ''),
        publicBaseUrl: normalizeBaseUrl(readOptional(rawEnv, 'R2_PUBLIC_BASE_URL', '')),
        presignExpiresSeconds: parsePositiveInt(rawEnv.R2_PRESIGN_EXPIRES_SECONDS, 120),
        maxImageBytes: parsePositiveInt(rawEnv.R2_MAX_IMAGE_BYTES, 5 * 1024 * 1024),
        allowedImageContentTypes: r2AllowedContentTypes.length
            ? r2AllowedContentTypes
            : DEFAULT_R2_ALLOWED_IMAGE_CONTENT_TYPES,
    };

    const googleOAuth = {
        clientId: readOptional(rawEnv, 'GOOGLE_CLIENT_ID', ''),
        clientSecret: readOptional(rawEnv, 'GOOGLE_CLIENT_SECRET', ''),
        callbackUrl: readOptional(rawEnv, 'GOOGLE_CALLBACK_URL', ''),
    };

    return {
        stripe,
        r2,
        googleOAuth,
    };
}

module.exports = {
    buildRuntimeConfig,
    buildIntegrationConfig,
    createEnvError,
};
