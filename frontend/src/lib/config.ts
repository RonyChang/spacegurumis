function normalizeBaseUrl(value: string | undefined): string {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
        return '';
    }

    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export type PublicConfig = {
    apiBaseUrl: string;
    whatsappNumber: string;
    whatsappTemplate: string;
    whatsappOrderTemplate: string;
};

export const publicConfig: PublicConfig = {
    apiBaseUrl: normalizeBaseUrl(import.meta.env.PUBLIC_API_BASE_URL),
    whatsappNumber: (import.meta.env.PUBLIC_WHATSAPP_NUMBER || '').trim(),
    whatsappTemplate: (import.meta.env.PUBLIC_WHATSAPP_TEMPLATE || '').trim()
        || 'Hola, quiero consultar por {productName}. SKU: {sku}.',
    whatsappOrderTemplate: (import.meta.env.PUBLIC_WHATSAPP_ORDER_TEMPLATE || '').trim()
        || 'Hola, quiero consultar por mi pedido #{orderId}. Total: {total}.',
};

