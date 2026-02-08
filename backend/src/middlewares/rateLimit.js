function getClientIp(req) {
    // Express respects trust proxy for req.ip. Prefer it when available.
    if (req && typeof req.ip === 'string' && req.ip.trim()) {
        return req.ip.trim();
    }

    // Fallback: best-effort, do NOT trust blindly unless proxy is controlled.
    const xff = req && req.headers ? req.headers['x-forwarded-for'] : null;
    if (typeof xff === 'string' && xff.trim()) {
        return xff.split(',')[0].trim();
    }

    return 'unknown';
}

function createRateLimiter({ windowMs, max, keyPrefix }) {
    const safeWindowMs = Number.isFinite(windowMs) && windowMs > 0 ? windowMs : 60_000;
    const safeMax = Number.isFinite(max) && max > 0 ? Math.floor(max) : 10;
    const prefix = keyPrefix ? String(keyPrefix) : 'rl';

    // In-memory counter store: good enough for a single instance.
    const store = new Map();

    return function rateLimiter(req, res, next) {
        const now = Date.now();
        const ip = getClientIp(req);
        const key = `${prefix}:${ip}`;

        const entry = store.get(key);
        if (!entry || entry.resetAt <= now) {
            store.set(key, { count: 1, resetAt: now + safeWindowMs });
            return next();
        }

        entry.count += 1;
        if (entry.count > safeMax) {
            const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
            res.setHeader('Retry-After', String(retryAfterSeconds));
            return res.status(429).json({
                data: null,
                message: 'Demasiadas solicitudes',
                errors: [{ message: 'Demasiadas solicitudes. Intenta más tarde.' }],
                meta: {},
            });
        }

        return next();
    };
}

module.exports = {
    createRateLimiter,
};

