import { buildServerApiUrl } from '../api/server';

export type PublicSessionSnapshot = 'authenticated' | 'guest' | 'unknown';

type ProbePublicSessionInput = {
    requestUrl: URL;
    cookieHeader: string | null;
};

function parseTrustedOrigins(requestUrl: URL) {
    const configured = String(import.meta.env.API_PUBLIC_SESSION_TRUSTED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

    const trusted = new Set<string>([requestUrl.origin]);
    for (const candidate of configured) {
        try {
            const parsed = new URL(candidate);
            if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
                trusted.add(parsed.origin);
            }
        } catch {
            // Ignora valores mal configurados para no romper SSR.
        }
    }

    return trusted;
}

export async function probePublicSession({
    requestUrl,
    cookieHeader,
}: ProbePublicSessionInput): Promise<PublicSessionSnapshot> {
    if (!cookieHeader) {
        return 'guest';
    }

    const trustedOrigins = parseTrustedOrigins(requestUrl);

    let profileUrl = '';
    try {
        profileUrl = buildServerApiUrl(requestUrl, '/api/v1/profile');
    } catch {
        return 'unknown';
    }

    let profileOrigin = '';
    try {
        profileOrigin = new URL(profileUrl).origin;
    } catch {
        return 'unknown';
    }

    if (!trustedOrigins.has(profileOrigin)) {
        return 'unknown';
    }

    try {
        const response = await fetch(profileUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                Cookie: cookieHeader,
            },
            cache: 'no-store',
        });

        if (response.ok) {
            return 'authenticated';
        }

        if (response.status === 401 || response.status === 403) {
            return 'guest';
        }

        return 'unknown';
    } catch {
        return 'unknown';
    }
}
