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

function parseCsv(value) {
    if (value === undefined || value === null) {
        return [];
    }

    return String(value)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parsePositiveInt(value, fallback) {
    const parsed = value === undefined || value === null ? NaN : Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return Math.floor(parsed);
}

module.exports = {
    parseBoolean,
    parseCsv,
    parsePositiveInt,
};

