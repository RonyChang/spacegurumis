import { apiGet, apiPut } from './client';
import type { User } from './auth';

export type ProfileAddress = {
    receiverName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    country: string;
    city: string;
    district: string;
    postalCode: string | null;
    reference: string | null;
};

export type Profile = {
    user: User;
    address: ProfileAddress | null;
};

export type ProfileUpdatePayload = {
    firstName?: string;
    lastName?: string;
    address?: {
        receiverName: string;
        phone: string;
        addressLine1: string;
        addressLine2?: string | null;
        country: string;
        city: string;
        district: string;
        postalCode?: string | null;
        reference?: string | null;
    };
};

export function getProfile(token: string) {
    return apiGet<Profile>('/api/v1/profile', { token });
}

export function updateProfile(token: string, payload: ProfileUpdatePayload) {
    return apiPut<Profile>('/api/v1/profile', payload, { token });
}

