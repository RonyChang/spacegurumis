function normalizeBaseUrl(value: string | undefined): string {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
        return '';
    }

    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function normalizeHttpUrl(value: string | undefined): string {
    const normalized = normalizeBaseUrl(value);
    if (!normalized) {
        return '';
    }

    try {
        const parsed = new URL(normalized);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return '';
        }

        return parsed.toString().replace(/\/+$/, '');
    } catch {
        return '';
    }
}

function normalizeHost(value: string | undefined): string {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (!trimmed) {
        return '';
    }

    try {
        const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
        const parsed = new URL(withProtocol);
        return parsed.host.toLowerCase().replace(/\.$/, '');
    } catch {
        return '';
    }
}

export type PublicConfig = {
    apiBaseUrl: string;
    imageTransformBaseUrl: string;
    imageSourceHost: string;
    whatsappNumber: string;
    whatsappTemplate: string;
    whatsappOrderTemplate: string;
};

export const publicConfig: PublicConfig = {
    apiBaseUrl: normalizeBaseUrl(import.meta.env.PUBLIC_API_BASE_URL),
    imageTransformBaseUrl: normalizeHttpUrl(import.meta.env.PUBLIC_IMAGE_TRANSFORM_BASE_URL),
    imageSourceHost: normalizeHost(import.meta.env.PUBLIC_IMAGE_SOURCE_HOST),
    whatsappNumber: (import.meta.env.PUBLIC_WHATSAPP_NUMBER || '').trim(),
    whatsappTemplate: (import.meta.env.PUBLIC_WHATSAPP_TEMPLATE || '').trim()
        || 'Hola, quiero consultar por {productName}. SKU: {sku}.',
    whatsappOrderTemplate: (import.meta.env.PUBLIC_WHATSAPP_ORDER_TEMPLATE || '').trim()
        || 'Hola, quiero consultar por mi pedido #{orderId}. Total: {total}.',
};
