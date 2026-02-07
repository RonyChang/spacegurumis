import { publicConfig } from './config';
import { formatPrice } from './format';

function normalizeNumber(value: string) {
    return String(value || '').replace(/\D/g, '');
}

export function buildWhatsappUrl(message: string) {
    const normalized = normalizeNumber(publicConfig.whatsappNumber);
    if (!normalized) {
        return '';
    }

    const text = message ? encodeURIComponent(message) : '';
    return text ? `https://wa.me/${normalized}?text=${text}` : `https://wa.me/${normalized}`;
}

export function buildWhatsappProductMessage(input: {
    productName: string;
    sku: string;
}) {
    const template = publicConfig.whatsappTemplate;
    return template
        .replace('{productName}', input.productName || 'Producto')
        .replace('{sku}', input.sku || '');
}

export function buildWhatsappOrderMessage(input: {
    orderId: number | string;
    total: number | null | undefined;
}) {
    const template = publicConfig.whatsappOrderTemplate;
    return template
        .replace('{orderId}', String(input.orderId || ''))
        .replace('{total}', formatPrice(input.total));
}

