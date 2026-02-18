import { publicConfig } from '../config';

export const IMAGE_DELIVERY_PRESETS = ['thumb', 'detail'] as const;
export type ImageDeliveryPreset = (typeof IMAGE_DELIVERY_PRESETS)[number];

const ALLOWED_SOURCE_PREFIXES = ['variants', 'products', 'categories', 'site'];

function normalizeHost(value: string): string {
    try {
        const parsed = new URL(value.includes('://') ? value : `https://${value}`);
        return parsed.host.toLowerCase().replace(/\.$/, '');
    } catch {
        return '';
    }
}

function normalizeTransformBase(value: string): URL | null {
    if (!value) {
        return null;
    }

    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return null;
        }

        // Build against a canonical slash-terminated base URL.
        return new URL(`${parsed.toString().replace(/\/+$/, '')}/`);
    } catch {
        return null;
    }
}

function isAllowedPreset(preset: string): preset is ImageDeliveryPreset {
    return (IMAGE_DELIVERY_PRESETS as readonly string[]).includes(preset);
}

function extractEligibleKey(pathname: string): string | null {
    if (!pathname) {
        return null;
    }

    const rawSegments = pathname.split('/').filter(Boolean);
    if (!rawSegments.length) {
        return null;
    }

    const decodedSegments: string[] = [];
    for (const segment of rawSegments) {
        let decoded = '';
        try {
            decoded = decodeURIComponent(segment);
        } catch {
            return null;
        }

        if (!decoded || decoded === '.' || decoded === '..') {
            return null;
        }

        if (decoded.includes('/') || decoded.includes('\\') || decoded.includes('\u0000')) {
            return null;
        }

        decodedSegments.push(decoded);
    }

    const rootPrefix = decodedSegments[0].toLowerCase();
    if (!ALLOWED_SOURCE_PREFIXES.includes(rootPrefix)) {
        return null;
    }

    return decodedSegments.join('/');
}

export function buildCatalogImageDeliveryUrl(sourceUrl: string, preset: ImageDeliveryPreset | string): string {
    const rawSource = typeof sourceUrl === 'string' ? sourceUrl.trim() : '';
    if (!rawSource) {
        return sourceUrl;
    }

    if (!isAllowedPreset(String(preset))) {
        return sourceUrl;
    }

    const transformBase = normalizeTransformBase(publicConfig.imageTransformBaseUrl);
    const sourceHost = normalizeHost(publicConfig.imageSourceHost);
    if (!transformBase || !sourceHost) {
        return sourceUrl;
    }

    let parsedSource: URL;
    try {
        parsedSource = new URL(rawSource);
    } catch {
        return sourceUrl;
    }

    if (parsedSource.protocol !== 'http:' && parsedSource.protocol !== 'https:') {
        return sourceUrl;
    }

    if (normalizeHost(parsedSource.host) !== sourceHost) {
        return sourceUrl;
    }

    const key = extractEligibleKey(parsedSource.pathname);
    if (!key) {
        return sourceUrl;
    }

    return new URL(`${preset}/${key}`, transformBase).toString();
}
