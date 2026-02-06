const discountRepository = require('../repositories/discount.repository');

function normalizeCode(value) {
    return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function nowUtc() {
    return new Date();
}

function centsToSoles(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const cents = Number(value);
    if (Number.isNaN(cents)) {
        return null;
    }

    return Number((cents / 100).toFixed(2));
}

function solesToCents(value) {
    return Math.round(Number(value) * 100);
}

function validateDiscountRules(discount, subtotalCents) {
    if (!discount || !discount.isActive) {
        return { error: 'Código inválido o inactivo' };
    }

    if (!Number.isFinite(Number(discount.percentage))) {
        return { error: 'Código inválido' };
    }

    if (discount.percentage <= 0 || discount.percentage > 100) {
        return { error: 'Porcentaje inválido' };
    }

    const now = nowUtc();
    if (discount.startsAt && new Date(discount.startsAt) > now) {
        return { error: 'Código fuera de fecha' };
    }

    if (discount.expiresAt && new Date(discount.expiresAt) < now) {
        return { error: 'Código vencido' };
    }

    if (Number.isFinite(Number(discount.maxUses)) && discount.maxUses !== null) {
        const used = Number(discount.usedCount || 0);
        if (used >= Number(discount.maxUses)) {
            return { error: 'Código sin usos disponibles' };
        }
    }

    if (Number.isFinite(Number(discount.minSubtotalCents)) && discount.minSubtotalCents !== null) {
        if (subtotalCents < Number(discount.minSubtotalCents)) {
            return { error: 'Subtotal mínimo no alcanzado' };
        }
    }

    return { ok: true };
}

async function validateDiscountForSubtotal(code, subtotalSoles) {
    const normalized = normalizeCode(code);
    if (!normalized) {
        return { error: 'Código requerido' };
    }

    const subtotalCents = solesToCents(Number(subtotalSoles) || 0);
    const discount = await discountRepository.findDiscountByCode(normalized);
    const rules = validateDiscountRules(discount, subtotalCents);
    if (!rules.ok) {
        return { error: rules.error };
    }

    const discountAmountCents = Math.round(
        subtotalCents * (Number(discount.percentage) / 100)
    );
    const finalSubtotalCents = Math.max(subtotalCents - discountAmountCents, 0);

    return {
        code: normalized,
        percentage: Number(discount.percentage),
        discountAmount: centsToSoles(discountAmountCents),
        finalSubtotal: centsToSoles(finalSubtotalCents),
    };
}

async function resolveDiscountForOrder(code, subtotalCents, transaction) {
    const normalized = normalizeCode(code);
    if (!normalized) {
        return { error: 'Código requerido' };
    }

    const discount = await discountRepository.findDiscountByCode(normalized, transaction);
    const rules = validateDiscountRules(discount, subtotalCents);
    if (!rules.ok) {
        return { error: rules.error };
    }

    const discountAmountCents = Math.round(
        subtotalCents * (Number(discount.percentage) / 100)
    );
    const finalSubtotalCents = Math.max(subtotalCents - discountAmountCents, 0);

    return {
        discount,
        code: normalized,
        percentage: Number(discount.percentage),
        amountCents: discountAmountCents,
        finalSubtotalCents,
    };
}

module.exports = {
    validateDiscountForSubtotal,
    resolveDiscountForOrder,
};
