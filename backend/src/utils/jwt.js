// JWT expiry strings in this project use patterns like "15m", "7d".
function parseJwtExpiresInToMs(expiresIn) {
    if (expiresIn === undefined || expiresIn === null) {
        return null;
    }

    const raw = String(expiresIn).trim();
    if (!raw) {
        return null;
    }

    // Numeric strings: treat as seconds (jsonwebtoken behavior).
    if (/^\d+$/.test(raw)) {
        const seconds = Number(raw);
        return Number.isFinite(seconds) ? seconds * 1000 : null;
    }

    const match = raw.match(/^(\d+)(ms|s|m|h|d)$/i);
    if (!match) {
        return null;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(amount)) {
        return null;
    }

    const multipliers = {
        ms: 1,
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return amount * (multipliers[unit] || 0);
}

module.exports = {
    parseJwtExpiresInToMs,
};
