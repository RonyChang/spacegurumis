import { addCartItem } from '../api/cart';
import type { GuestCartItem } from './guestCart';
import { clearGuestCart, readGuestCart, writeGuestCart } from './guestCart';

export async function syncGuestCartToBackend(token: string): Promise<{
    ok: boolean;
    failedItems: GuestCartItem[];
}> {
    const safeToken = typeof token === 'string' ? token.trim() : '';
    if (!safeToken) {
        return { ok: true, failedItems: [] };
    }

    const items = readGuestCart();
    if (!items.length) {
        return { ok: true, failedItems: [] };
    }

    const failedItems: GuestCartItem[] = [];
    for (const item of items) {
        try {
            await addCartItem(safeToken, item.sku, item.quantity);
        } catch {
            failedItems.push(item);
        }
    }

    if (failedItems.length) {
        writeGuestCart(failedItems);
        return { ok: false, failedItems };
    }

    clearGuestCart();
    return { ok: true, failedItems: [] };
}

