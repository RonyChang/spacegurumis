/// <reference types="astro/client" />

interface ImportMetaEnv {
    readonly PUBLIC_API_BASE_URL?: string;
    readonly PUBLIC_IMAGE_TRANSFORM_BASE_URL?: string;
    readonly PUBLIC_IMAGE_SOURCE_HOST?: string;
    readonly PUBLIC_WHATSAPP_NUMBER?: string;
    readonly PUBLIC_WHATSAPP_TEMPLATE?: string;
    readonly PUBLIC_WHATSAPP_ORDER_TEMPLATE?: string;
    readonly API_INTERNAL_BASE_URL?: string;
    readonly API_PUBLIC_SESSION_TRUSTED_ORIGINS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
