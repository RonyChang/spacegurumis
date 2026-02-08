import { apiDelete, apiGet, apiPatch, apiPost } from './client';

export type CartItem = {
    sku: string;
    productName: string;
    variantName: string | null;
    price: number | null;
    quantity: number;
};

export type CartSummary = {
    subtotal: number;
    totalItems: number;
};

export type Cart = {
    items: CartItem[];
    summary: CartSummary;
};

export function getCart() {
    return apiGet<Cart>('/api/v1/cart');
}

export function addCartItem(sku: string, quantity: number) {
    return apiPost<Cart>('/api/v1/cart/items', { sku, quantity });
}

export function updateCartItem(sku: string, quantity: number) {
    return apiPatch<Cart>(`/api/v1/cart/items/${encodeURIComponent(sku)}`, { quantity });
}

export function deleteCartItem(sku: string) {
    return apiDelete<Cart>(`/api/v1/cart/items/${encodeURIComponent(sku)}`);
}

export function clearCart() {
    return apiDelete<Cart>('/api/v1/cart');
}
