import { clearGuestCart } from '../cart/guestCart';
import { syncGuestCartToBackend } from '../cart/syncGuestCart';
import { setFlash } from './flash';
import { logout as apiLogout } from '../api/auth';

export async function afterLogin() {
    const { ok } = await syncGuestCartToBackend();
    if (!ok) {
        setFlash('cartSyncError', 'No se pudo sincronizar el carrito local.');
    }
}

export function clearSession() {
    clearGuestCart();
}

export async function logout() {
    try {
        await apiLogout();
    } catch {
        // Best-effort: even if the network fails, we still clear local state.
    } finally {
        clearSession();
    }
}
