import { publicConfig } from '../config';
import type { ApiResponse } from './client';

function normalizeBaseUrl(value: string | undefined): string {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
        return '';
    }

    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function getServerApiBase(requestUrl: URL): string {
    const internalBase = normalizeBaseUrl(import.meta.env.API_INTERNAL_BASE_URL);
    if (internalBase) {
        return internalBase;
    }

    if (publicConfig.apiBaseUrl) {
        return publicConfig.apiBaseUrl;
    }

    return requestUrl.origin;
}

export function buildServerApiUrl(requestUrl: URL, path: string): string {
    if (!path) {
        throw new Error('API path is required');
    }

    if (!path.startsWith('/')) {
        throw new Error(`API path must start with "/": ${path}`);
    }

    const base = getServerApiBase(requestUrl);
    return new URL(path, base).toString();
}

function getErrorMessage(payload: unknown, fallback: string): string {
    if (payload && typeof payload === 'object') {
        const anyPayload = payload as { message?: unknown; errors?: Array<{ message?: unknown }> };

        if (Array.isArray(anyPayload.errors) && anyPayload.errors.length) {
            const firstMessage = anyPayload.errors[0]?.message;
            if (typeof firstMessage === 'string' && firstMessage.trim()) {
                return firstMessage;
            }
        }

        if (typeof anyPayload.message === 'string' && anyPayload.message.trim()) {
            return anyPayload.message;
        }
    }

    return fallback;
}

export async function serverApiGet<TData, TMeta = Record<string, unknown>>(
    requestUrl: URL,
    path: string
): Promise<ApiResponse<TData, TMeta>> {
    const url = buildServerApiUrl(requestUrl, path);
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
        },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(getErrorMessage(payload, `Request failed with status ${response.status}`));
    }

    return (payload || { data: null, message: 'OK', errors: [], meta: {} }) as ApiResponse<
        TData,
        TMeta
    >;
}

