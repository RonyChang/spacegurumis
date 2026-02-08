import { addCartItem } from '../api/cart';
import type { GuestCartItem } from './guestCart';
import { clearGuestCart, readGuestCart, writeGuestCart } from './guestCart';

export async function syncGuestCartToBackend(): Promise<{
    ok: boolean;
    failedItems: GuestCartItem[];
}> {
    const items = readGuestCart();
    if (!items.length) {
        return { ok: true, failedItems: [] };
    }

    const failedItems: GuestCartItem[] = [];
    for (const item of items) {
        try {
            await addCartItem(item.sku, item.quantity);
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
