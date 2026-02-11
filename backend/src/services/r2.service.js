const crypto = require('node:crypto');

const r2 = require('../config/r2');

function encodeRfc3986(value) {
    return encodeURIComponent(String(value))
        .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function encodeS3Path(path) {
    // Keep "/" separators, but encode each segment.
    return String(path || '')
        .split('/')
        .map((segment) => encodeRfc3986(segment))
        .join('/');
}

function sha256Hex(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hmac(key, value, encoding) {
    const digest = crypto.createHmac('sha256', key).update(String(value)).digest();
    return encoding ? digest.toString(encoding) : digest;
}

function toAmzDateParts(date) {
    const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    // iso looks like YYYYMMDDTHHMMSSZ
    const amzDate = iso;
    const dateStamp = iso.slice(0, 8);
    return { amzDate, dateStamp };
}

function getSigningKey(secretAccessKey, dateStamp, region, service) {
    const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, service);
    return hmac(kService, 'aws4_request');
}

function clampExpiresSeconds(value) {
    // Keep this bounded to reduce abuse risk.
    const seconds = Number(value);
    if (!Number.isFinite(seconds)) {
        return 120;
    }
    return Math.min(300, Math.max(60, Math.floor(seconds)));
}

function normalizeContentType(value) {
    return String(value || '').trim().toLowerCase();
}

function contentTypeToExtension(contentType) {
    const normalized = normalizeContentType(contentType);
    if (normalized === 'image/jpeg') return 'jpg';
    if (normalized === 'image/png') return 'png';
    if (normalized === 'image/webp') return 'webp';
    if (normalized === 'image/avif') return 'avif';
    return '';
}

function buildImageKey(variantId, contentType) {
    const id = Number(variantId);
    if (!Number.isFinite(id) || !Number.isInteger(id) || id <= 0) {
        throw new Error('variantId invalido');
    }

    const extension = contentTypeToExtension(contentType);
    if (!extension) {
        throw new Error('contentType no permitido');
    }

    const uuid = crypto.randomUUID();
    return `variants/${id}/${uuid}.${extension}`;
}

function normalizeSlotForKey(slot) {
    return String(slot || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

function buildSiteAssetKey(slot, contentType) {
    const normalizedSlot = normalizeSlotForKey(slot);
    if (!normalizedSlot) {
        throw new Error('slot invalido');
    }

    const extension = contentTypeToExtension(contentType);
    if (!extension) {
        throw new Error('contentType no permitido');
    }

    const uuid = crypto.randomUUID();
    return `site/${normalizedSlot}/${uuid}.${extension}`;
}

function buildPublicUrl(publicBaseUrl, imageKey) {
    const base = String(publicBaseUrl || '').trim().replace(/\/+$/, '');
    if (!base) {
        return '';
    }
    return `${base}/${String(imageKey).replace(/^\/+/, '')}`;
}

function validateImageUploadRequest({ contentType, byteSize }) {
    const normalizedContentType = normalizeContentType(contentType);
    if (!normalizedContentType) {
        return { ok: false, error: 'contentType requerido' };
    }

    const allowed = new Set((r2.allowedImageContentTypes || []).map((t) => t.toLowerCase()));
    if (!allowed.has(normalizedContentType)) {
        return { ok: false, error: 'Tipo de archivo no permitido' };
    }

    const size = Number(byteSize);
    if (!Number.isFinite(size) || size <= 0) {
        return { ok: false, error: 'byteSize invalido' };
    }
    if (size > r2.maxImageBytes) {
        return { ok: false, error: 'Archivo excede el tamano maximo' };
    }

    return { ok: true };
}

function presignPutObject({
    endpoint,
    bucket,
    key,
    accessKeyId,
    secretAccessKey,
    region,
    expiresInSeconds,
    contentType,
    now = new Date(),
}) {
    const safeEndpoint = String(endpoint || '').trim().replace(/\/+$/, '');
    if (!safeEndpoint) {
        throw new Error('R2 endpoint no configurado');
    }
    const safeBucket = String(bucket || '').trim();
    if (!safeBucket) {
        throw new Error('R2 bucket no configurado');
    }
    const safeAccessKeyId = String(accessKeyId || '').trim();
    const safeSecret = String(secretAccessKey || '').trim();
    if (!safeAccessKeyId || !safeSecret) {
        throw new Error('Credenciales R2 no configuradas');
    }

    const safeRegion = String(region || 'auto').trim() || 'auto';
    const safeExpires = clampExpiresSeconds(expiresInSeconds);

    const { amzDate, dateStamp } = toAmzDateParts(now);
    const service = 's3';
    const credentialScope = `${dateStamp}/${safeRegion}/${service}/aws4_request`;

    const url = new URL(safeEndpoint);
    const host = url.host;

    const canonicalUri = `/${encodeS3Path(safeBucket)}/${encodeS3Path(key)}`;

    const query = new Map([
        ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
        ['X-Amz-Credential', `${safeAccessKeyId}/${credentialScope}`],
        ['X-Amz-Date', amzDate],
        ['X-Amz-Expires', String(safeExpires)],
        ['X-Amz-SignedHeaders', 'content-type;host'],
    ]);

    const canonicalQueryString = Array.from(query.entries())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
        .join('&');

    const canonicalHeaders = [
        `content-type:${normalizeContentType(contentType)}`,
        `host:${host}`,
        '',
    ].join('\n');

    const signedHeaders = 'content-type;host';
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = [
        'PUT',
        canonicalUri,
        canonicalQueryString,
        canonicalHeaders,
        signedHeaders,
        payloadHash,
    ].join('\n');

    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256Hex(canonicalRequest),
    ].join('\n');

    const signingKey = getSigningKey(safeSecret, dateStamp, safeRegion, service);
    const signature = hmac(signingKey, stringToSign, 'hex');

    const finalUrl = `${safeEndpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    return {
        uploadUrl: finalUrl,
        expiresInSeconds: safeExpires,
        headers: {
            'Content-Type': normalizeContentType(contentType),
        },
    };
}

async function headPublicObject(publicUrl, { timeoutMs = 10_000 } = {}) {
    const url = String(publicUrl || '').trim();
    if (!url) {
        return { exists: false, status: 0, contentType: null, byteSize: null };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
            signal: controller.signal,
        });

        if (res.status === 404) {
            return { exists: false, status: 404, contentType: null, byteSize: null };
        }

        if (!res.ok) {
            return { exists: false, status: res.status, contentType: null, byteSize: null };
        }

        const contentType = res.headers.get('content-type');
        const contentLength = res.headers.get('content-length');
        const byteSize = contentLength && Number.isFinite(Number(contentLength))
            ? Number(contentLength)
            : null;

        return {
            exists: true,
            status: res.status,
            contentType: contentType ? String(contentType) : null,
            byteSize,
        };
    } catch (error) {
        return { exists: false, status: 0, contentType: null, byteSize: null, error };
    } finally {
        clearTimeout(timeout);
    }
}

function presignVariantImageUpload({ variantId, contentType, byteSize }) {
    const validation = validateImageUploadRequest({ contentType, byteSize });
    if (!validation.ok) {
        const err = new Error(validation.error || 'Solicitud invalida');
        err.status = 400;
        throw err;
    }

    const imageKey = buildImageKey(variantId, contentType);
    const publicUrl = buildPublicUrl(r2.publicBaseUrl, imageKey);

    const presigned = presignPutObject({
        endpoint: r2.endpoint,
        bucket: r2.bucket,
        key: imageKey,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        region: r2.region,
        expiresInSeconds: r2.presignExpiresSeconds,
        contentType,
    });

    return {
        uploadUrl: presigned.uploadUrl,
        imageKey,
        publicUrl,
        expiresInSeconds: presigned.expiresInSeconds,
        headers: presigned.headers,
    };
}

function presignSiteAssetUpload({ slot, contentType, byteSize }) {
    const validation = validateImageUploadRequest({ contentType, byteSize });
    if (!validation.ok) {
        const err = new Error(validation.error || 'Solicitud invalida');
        err.status = 400;
        throw err;
    }

    const imageKey = buildSiteAssetKey(slot, contentType);
    const publicUrl = buildPublicUrl(r2.publicBaseUrl, imageKey);

    const presigned = presignPutObject({
        endpoint: r2.endpoint,
        bucket: r2.bucket,
        key: imageKey,
        accessKeyId: r2.accessKeyId,
        secretAccessKey: r2.secretAccessKey,
        region: r2.region,
        expiresInSeconds: r2.presignExpiresSeconds,
        contentType,
    });

    return {
        uploadUrl: presigned.uploadUrl,
        imageKey,
        publicUrl,
        expiresInSeconds: presigned.expiresInSeconds,
        headers: presigned.headers,
    };
}

module.exports = {
    clampExpiresSeconds,
    contentTypeToExtension,
    buildImageKey,
    buildSiteAssetKey,
    buildPublicUrl,
    validateImageUploadRequest,
    presignPutObject,
    presignVariantImageUpload,
    presignSiteAssetUpload,
    // Backward-compatible alias.
    presignProductImageUpload: presignVariantImageUpload,
    headPublicObject,
};
