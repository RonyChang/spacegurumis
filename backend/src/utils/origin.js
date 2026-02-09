function normalizeOrigin(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
        return '';
    }

    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

module.exports = {
    normalizeOrigin,
};

