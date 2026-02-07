import { publicConfig } from '../config';

export function buildApiUrl(path: string): string {
    if (!path) {
        throw new Error('API path is required');
    }

    if (!path.startsWith('/')) {
        throw new Error(`API path must start with "/": ${path}`);
    }

    const base = publicConfig.apiBaseUrl;
    if (!base) {
        return path;
    }

    return new URL(path, base).toString();
}

