import { apiPost } from './client';

export type DiscountValidation = {
    code: string;
    percentage: number;
    discountAmount: number | null;
    finalSubtotal: number | null;
};

export function validateDiscount(code: string, subtotal: number) {
    return apiPost<DiscountValidation>('/api/v1/discounts/validate', { code, subtotal });
}

