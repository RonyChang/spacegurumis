import { apiPost } from './client';

export type StripeSession = {
    sessionId: string;
    checkoutUrl: string;
};

export function createStripeSession(token: string, orderId: number) {
    return apiPost<StripeSession>('/api/v1/payments/stripe/session', { orderId }, { token });
}

