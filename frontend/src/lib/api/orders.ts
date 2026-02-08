import { apiGet, apiPost } from './client';

export type PaginationMeta = {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

export type OrderSummary = {
    id: number;
    orderStatus: string;
    paymentStatus: string;
    subtotal: number | null;
    shippingCost: number | null;
    discountCode: string | null;
    discountPercentage: number | null;
    discountAmount: number | null;
    total: number | null;
    createdAt: string;
};

export type OrderItem = {
    sku: string;
    productName: string;
    variantName: string | null;
    price: number | null;
    quantity: number;
};

export type OrderDetail = {
    id: number;
    orderStatus: string;
    paymentStatus: string;
    subtotal: number | null;
    shippingCost: number | null;
    discountCode: string | null;
    discountPercentage: number | null;
    discountAmount: number | null;
    total: number | null;
    createdAt: string;
    items: OrderItem[];
};

export type CreateOrderResult = {
    id: number;
    orderStatus: string;
    paymentStatus: string;
    subtotal: number | null;
    shippingCost: number | null;
    total: number | null;
    discountCode: string | null;
    discountPercentage: number | null;
    discountAmount: number | null;
    items: OrderItem[];
};

export function listOrders(page: number, pageSize: number) {
    const safePage = Number.isFinite(Number(page)) && page > 0 ? Math.floor(page) : 1;
    const safePageSize =
        Number.isFinite(Number(pageSize)) && pageSize > 0 ? Math.floor(pageSize) : 20;
    return apiGet<OrderSummary[], PaginationMeta>(
        `/api/v1/orders?page=${safePage}&pageSize=${safePageSize}`
    );
}

export function getOrderDetail(id: number) {
    return apiGet<OrderDetail>(`/api/v1/orders/${id}`);
}

export function createOrder(discountCode: string | null) {
    return apiPost<CreateOrderResult>('/api/v1/orders', { discountCode });
}
