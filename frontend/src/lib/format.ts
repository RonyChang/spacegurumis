export function formatPrice(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return 'S/ -';
    }

    return `S/ ${Number(value).toFixed(2)}`;
}

export function formatDate(value: string | Date | null | undefined) {
    if (!value) {
        return '-';
    }

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('es-PE');
}

export function formatVariantTitle(variant: {
    variantName?: string | null;
    product?: { name?: string | null } | null;
}) {
    const baseName = variant && variant.product && variant.product.name ? variant.product.name : 'Producto';
    const variantName = variant && variant.variantName ? variant.variantName : '';
    return variantName ? `${baseName} - ${variantName}` : baseName;
}

