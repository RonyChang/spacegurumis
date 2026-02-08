function securityHeaders(req, res, next) {
    // Baseline security headers for API responses.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');

    // Keep CSP minimal for API responses; frontend SSR is served by a different service.
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

    return next();
}

module.exports = securityHeaders;

