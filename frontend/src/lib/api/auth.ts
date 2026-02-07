import { apiPost } from './client';
import { buildApiUrl } from './url';

export type User = {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
};

export type AuthOk = {
    user: User;
    token: string;
};

export type LoginResult =
    | AuthOk
    | {
        twoFactorRequired: true;
        email: string;
    };

export type RegisterResult = {
    verificationRequired: true;
    resent: boolean;
    email: string;
};

export function register(email: string, password: string) {
    return apiPost<RegisterResult>('/api/v1/auth/register', { email, password });
}

export function login(email: string, password: string) {
    return apiPost<LoginResult>('/api/v1/auth/login', { email, password });
}

export function verifyEmail(email: string, code: string) {
    return apiPost<AuthOk>('/api/v1/auth/verify-email', { email, code });
}

export function resendVerification(email: string) {
    return apiPost<{ sent: true }>('/api/v1/auth/resend-verification', { email });
}

export function verifyAdminTwoFactor(email: string, code: string) {
    return apiPost<AuthOk>('/api/v1/auth/admin/verify-2fa', { email, code });
}

export function buildGoogleStartUrl() {
    return buildApiUrl('/api/v1/auth/google');
}

