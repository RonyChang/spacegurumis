const AUTH_TOKEN_KEY = 'authToken';

function isBrowser() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getAuthToken(): string {
    if (!isBrowser()) {
        return '';
    }

    return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token: string) {
    if (!isBrowser()) {
        return;
    }

    const value = typeof token === 'string' ? token.trim() : '';
    if (!value) {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
        return;
    }

    window.localStorage.setItem(AUTH_TOKEN_KEY, value);
}

export function clearAuthToken() {
    if (!isBrowser()) {
        return;
    }

    window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

