const FLASH_PREFIX = 'flash:';

function isBrowser() {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function setFlash(key: string, value: string) {
    if (!isBrowser()) {
        return;
    }

    const safeKey = `${FLASH_PREFIX}${key}`;
    const safeValue = typeof value === 'string' ? value : '';
    if (!safeValue) {
        window.sessionStorage.removeItem(safeKey);
        return;
    }

    window.sessionStorage.setItem(safeKey, safeValue);
}

export function consumeFlash(key: string) {
    if (!isBrowser()) {
        return '';
    }

    const safeKey = `${FLASH_PREFIX}${key}`;
    const value = window.sessionStorage.getItem(safeKey) || '';
    window.sessionStorage.removeItem(safeKey);
    return value;
}

