import { apiGet } from './client';

export type SiteAsset = {
    id: number;
    slot: string;
    title: string | null;
    altText: string | null;
    publicUrl: string;
    sortOrder: number;
};

export function listSiteAssetsBySlot(slot: string) {
    return apiGet<SiteAsset[]>(`/api/v1/site-assets/${encodeURIComponent(slot)}`);
}
