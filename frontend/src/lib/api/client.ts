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
    token?: string;
    json?: unknown;
};

export async function apiFetch<TData, TMeta = Record<string, unknown>>(
    path: string,
    init: ApiInit = {}
): Promise<ApiResponse<TData, TMeta>> {
    const { token, json, headers, ...rest } = init;

    const mergedHeaders = new Headers(headers);
    if (token) {
        mergedHeaders.set('Authorization', `Bearer ${token}`);
    }

    let body: string | undefined;
    if (json !== undefined) {
        mergedHeaders.set('Content-Type', 'application/json');
        body = JSON.stringify(json);
    }

    const url = buildApiUrl(path);

    let response: Response;
    try {
        response = await fetch(url, {
            ...rest,
            headers: mergedHeaders,
            body,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Network error';
        throw new ApiError(message, 0, null);
    }

    const payload = await safeJson(response);

    if (!response.ok) {
        throw new ApiError(
            getErrorMessage(payload, 'Request failed'),
            response.status,
            payload
        );
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

