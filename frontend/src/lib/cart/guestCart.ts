export type GuestCartItem = {
    sku: string;
    productName: string;
    variantName: string | null;
    price: number;
    quantity: number;
};

const GUEST_CART_KEY = 'guestCart';

function isBrowser() {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalize(items: unknown): GuestCartItem[] {
    if (!Array.isArray(items)) {
        return [];
    }

    return items
        .map((item) => {
            const anyItem = item as Partial<GuestCartItem>;
            const sku = typeof anyItem.sku === 'string' ? anyItem.sku.trim() : '';
            const quantity = Number(anyItem.quantity);
            const price = Number(anyItem.price);

            return {
                sku,
                productName:
                    typeof anyItem.productName === 'string' && anyItem.productName.trim()
                        ? anyItem.productName.trim()
                        : 'Producto',
                variantName:
                    typeof anyItem.variantName === 'string' && anyItem.variantName.trim()
                        ? anyItem.variantName.trim()
                        : null,
                price: Number.isFinite(price) ? price : 0,
                quantity:
                    Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0,
            };
        })
        .filter((item) => item.sku && item.quantity > 0);
}

export function readGuestCart(): GuestCartItem[] {
    if (!isBrowser()) {
        return [];
    }

    const raw = window.localStorage.getItem(GUEST_CART_KEY);
    if (!raw) {
        return [];
    }

    try {
        return normalize(JSON.parse(raw));
    } catch {
        return [];
    }
}

export function writeGuestCart(items: GuestCartItem[]): GuestCartItem[] {
    const normalized = normalize(items);

    if (!isBrowser()) {
        return normalized;
    }

    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(normalized));
    return normalized;
}

export function clearGuestCart() {
    if (!isBrowser()) {
        return;
    }

    window.localStorage.removeItem(GUEST_CART_KEY);
}

export function getGuestCartCount(items: GuestCartItem[]) {
    return items.reduce((total, item) => total + item.quantity, 0);
}

export function getGuestCartSubtotal(items: GuestCartItem[]) {
    const subtotal = items.reduce((total, item) => total + (Number(item.price) || 0) * item.quantity, 0);
    return Number(subtotal.toFixed(2));
}

