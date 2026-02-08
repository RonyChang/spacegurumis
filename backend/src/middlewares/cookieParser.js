function parseCookieHeader(headerValue) {
    const header = typeof headerValue === 'string' ? headerValue : '';
    if (!header.trim()) {
        return {};
    }

    const out = {};
    const parts = header.split(';');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) {
            continue;
        }

        const idx = trimmed.indexOf('=');
        if (idx <= 0) {
            continue;
        }

        const key = trimmed.slice(0, idx).trim();
        const rawValue = trimmed.slice(idx + 1).trim();
        if (!key) {
            continue;
        }

        try {
            out[key] = decodeURIComponent(rawValue);
        } catch {
            out[key] = rawValue;
        }
    }

    return out;
}

function cookieParser(req, res, next) {
    req.cookies = parseCookieHeader(req.headers && req.headers.cookie);
    return next();
}

module.exports = cookieParser;
module.exports.parseCookieHeader = parseCookieHeader;

