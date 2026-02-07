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

export function getCart(token: string) {
    return apiGet<Cart>('/api/v1/cart', { token });
}

export function addCartItem(token: string, sku: string, quantity: number) {
    return apiPost<Cart>('/api/v1/cart/items', { sku, quantity }, { token });
}

export function updateCartItem(token: string, sku: string, quantity: number) {
    return apiPatch<Cart>(`/api/v1/cart/items/${encodeURIComponent(sku)}`, { quantity }, { token });
}

export function deleteCartItem(token: string, sku: string) {
    return apiDelete<Cart>(`/api/v1/cart/items/${encodeURIComponent(sku)}`, { token });
}

export function clearCart(token: string) {
    return apiDelete<Cart>('/api/v1/cart', { token });
}

