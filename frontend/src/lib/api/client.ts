import { buildApiUrl } from './url';

export type ApiErrorItem = { message: string };

export type ApiResponse<TData, TMeta = Record<string, unknown>> = {
    data: TData;
    message: string;
    errors: ApiErrorItem[];
    meta: TMeta;
};

function getErrorMessage(payload: unknown, fallback: string): string {
    if (payload && typeof payload === 'object') {
        const anyPayload = payload as { errors?: ApiErrorItem[]; message?: unknown };

        if (Array.isArray(anyPayload.errors) && anyPayload.errors.length) {
            const first = anyPayload.errors[0];
            if (first && typeof first.message === 'string' && first.message.trim()) {
                return first.message;
            }
        }

        if (typeof anyPayload.message === 'string' && anyPayload.message.trim()) {
            return anyPayload.message;
        }
    }

    return fallback;
}

async function safeJson(res: Response): Promise<unknown> {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

export class ApiError extends Error {
    status: number;
    payload: unknown;

    constructor(message: string, status: number, payload: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }
}

type ApiInit = Omit<RequestInit, 'body'> & {
    json?: unknown;
};

const CSRF_COOKIE_NAME = 'sg_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

function isBrowser() {
    return typeof document !== 'undefined' && typeof document.cookie === 'string';
}

function readCookie(name: string): string {
    if (!isBrowser()) {
        return '';
    }

    const target = `${encodeURIComponent(name)}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed.startsWith(target)) {
            continue;
        }

        const value = trimmed.slice(target.length);
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }

    return '';
}

function isMutatingMethod(method: string | undefined) {
    const m = String(method || 'GET').toUpperCase();
    return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

function isAuthEndpoint(path: string) {
    return path.startsWith('/api/v1/auth/');
}

let refreshPromise: Promise<void> | null = null;
let refreshCooldownUntil = 0;
const REFRESH_COOLDOWN_MS = 30_000;

async function refreshSession() {
    if (Date.now() < refreshCooldownUntil) {
        throw new Error('Refresh cooldown');
    }

    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        const url = buildApiUrl('/api/v1/auth/refresh');
        const res = await fetch(url, { method: 'POST', credentials: 'include' });
        if (!res.ok) {
            const payload = await safeJson(res);
            if (res.status === 401 || res.status === 403 || res.status === 404) {
                // Avoid hammering refresh when the user is logged out or refresh is disabled.
                refreshCooldownUntil = Date.now() + REFRESH_COOLDOWN_MS;
            }
            throw new ApiError(getErrorMessage(payload, 'Request failed'), res.status, payload);
        }

        refreshCooldownUntil = 0;
    })().finally(() => {
        refreshPromise = null;
    });

    return refreshPromise;
}

export async function apiFetch<TData, TMeta = Record<string, unknown>>(
    path: string,
    init: ApiInit = {}
): Promise<ApiResponse<TData, TMeta>> {
    const { json, headers, ...rest } = init;

    const baseHeaders = new Headers(headers);
    let body: string | undefined;
    if (json !== undefined) {
        baseHeaders.set('Content-Type', 'application/json');
        body = JSON.stringify(json);
    }

    const isMutating = isMutatingMethod(rest.method);

    const url = buildApiUrl(path);

    async function doFetch() {
        const requestHeaders = new Headers(baseHeaders);
        if (isMutating) {
            // Re-read CSRF per attempt because refresh can rotate the CSRF cookie.
            const csrfToken = readCookie(CSRF_COOKIE_NAME);
            if (csrfToken) {
                requestHeaders.set(CSRF_HEADER_NAME, csrfToken);
            }
        }

        let response: Response;
        try {
            response = await fetch(url, {
                ...rest,
                credentials: rest.credentials ?? 'include',
                headers: requestHeaders,
                body,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Network error';
            throw new ApiError(message, 0, null);
        }

        const payload = await safeJson(response);
        return { response, payload };
    }

    let { response, payload } = await doFetch();
    if (!response.ok && response.status === 401 && !isAuthEndpoint(path)) {
        // Try refresh once, then retry the original request.
        try {
            await refreshSession();
        } catch {
            // If refresh fails, surface the original 401.
        }

        ({ response, payload } = await doFetch());
    }

    if (!response.ok) {
        throw new ApiError(getErrorMessage(payload, 'Request failed'), response.status, payload);
    }

    return (payload || { data: null, message: 'OK', errors: [], meta: {} }) as ApiResponse<
        TData,
        TMeta
    >;
}

export function apiGet<TData, TMeta = Record<string, unknown>>(
    path: string,
    init: Omit<ApiInit, 'json' | 'method'> = {}
) {
    return apiFetch<TData, TMeta>(path, { ...init, method: 'GET' });
}

export function apiPost<TData, TMeta = Record<string, unknown>>(
    path: string,
    json: unknown,
    init: Omit<ApiInit, 'json' | 'method'> = {}
) {
    return apiFetch<TData, TMeta>(path, { ...init, method: 'POST', json });
}

export function apiPut<TData, TMeta = Record<string, unknown>>(
    path: string,
    json: unknown,
    init: Omit<ApiInit, 'json' | 'method'> = {}
) {
    return apiFetch<TData, TMeta>(path, { ...init, method: 'PUT', json });
}

export function apiPatch<TData, TMeta = Record<string, unknown>>(
    path: string,
    json: unknown,
    init: Omit<ApiInit, 'json' | 'method'> = {}
) {
    return apiFetch<TData, TMeta>(path, { ...init, method: 'PATCH', json });
}

export function apiDelete<TData, TMeta = Record<string, unknown>>(
    path: string,
    init: Omit<ApiInit, 'json' | 'method'> = {}
) {
    return apiFetch<TData, TMeta>(path, { ...init, method: 'DELETE' });
}
