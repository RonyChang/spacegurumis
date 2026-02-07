import { clearGuestCart } from '../cart/guestCart';
import { syncGuestCartToBackend } from '../cart/syncGuestCart';
import { clearAuthToken, setAuthToken } from './authToken';
import { setFlash } from './flash';

export async function saveSession(token: string) {
    const safeToken = typeof token === 'string' ? token.trim() : '';
    if (!safeToken) {
        return;
    }

    setAuthToken(safeToken);

    const { ok } = await syncGuestCartToBackend(safeToken);
    if (!ok) {
        setFlash('cartSyncError', 'No se pudo sincronizar el carrito local.');
    }
}

export function clearSession() {
    clearAuthToken();
    clearGuestCart();
}

