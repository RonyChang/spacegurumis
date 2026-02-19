# Cloudflare Image Worker Contract

## Objetivo

Definir el contrato operativo del Worker de imagenes para que el storefront reciba transforms `1:1`
sin deformacion, con relleno negro consistente y con opcion de URLs firmadas.

## Ruta y DNS requeridos

- Worker route: `img.spacegurumis.lat/*`
- DNS record: `img` en modo proxied (nube naranja)
- `SOURCE_HOST` en Worker: `assets.spacegurumis.lat`

## Presets obligatorios

- `thumb`: thumbnails de Product Detail
- `card`: cards/listados
- `detail`: imagen principal de Product Detail

Todos con:
- `fit: "pad"`
- `background: "rgb(0,0,0)"`
- `gravity: "center"`

## Hardening obligatorio

- Rechazar preset fuera de `thumb|card|detail`.
- Rechazar keys vacias, con `..`, con `\\` o sin prefijo permitido.
- Prefijos permitidos:
  - `variants/`
  - `products/`
  - `categories/`
  - `site/`
- Permitir solo `GET`/`HEAD`.
- Usar cache key estable (sin querystring libre) para reducir cache-busting abusivo.

## Modo firmado opcional

Variables en Worker:
- `REQUIRE_SIGNED_URLS` (`true|false`)
- `IMAGE_SIGNING_SECRET` (requerida si signed mode está activo)
- `SIGNED_URL_MAX_TTL_SECONDS` (ejemplo: `900`)

Contrato de firma:
- Query params esperados: `exp`, `sig`
- Payload canónico HMAC-SHA256: `<preset>/<key>:<exp>`
- `sig` en hexadecimal (64 chars)

## Script de referencia del Worker

```js
const PRESETS = {
  thumb: {
    width: 240,
    height: 240,
    fit: "pad",
    background: "rgb(0,0,0)",
    gravity: "center",
    quality: 80,
    format: "auto",
  },
  card: {
    width: 640,
    height: 640,
    fit: "pad",
    background: "rgb(0,0,0)",
    gravity: "center",
    quality: 82,
    format: "auto",
  },
  detail: {
    width: 1080,
    height: 1080,
    fit: "pad",
    background: "rgb(0,0,0)",
    gravity: "center",
    quality: 85,
    format: "auto",
  },
};

const ALLOWED_PREFIXES = ["variants/", "products/", "categories/", "site/"];
const CACHE_MAX_AGE_SECONDS = 31536000;
const encoder = new TextEncoder();

let cachedSecret = null;
let cachedKeyPromise = null;

function envBool(value, fallback = false) {
  if (typeof value !== "string") return fallback;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getHmacKey(secret) {
  if (cachedKeyPromise && cachedSecret === secret) return cachedKeyPromise;
  cachedSecret = secret;
  cachedKeyPromise = crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return cachedKeyPromise;
}

async function hmacHex(secret, payload) {
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(sig);
}

function acceptBucket(acceptHeader = "") {
  const a = acceptHeader.toLowerCase();
  if (a.includes("image/avif")) return "avif";
  if (a.includes("image/webp")) return "webp";
  return "legacy";
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    const preset = parts.shift();
    const rawKey = parts.join("/");

    let key;
    try {
      key = decodeURIComponent(rawKey);
    } catch {
      return new Response("Not found", { status: 404 });
    }

    if (
      !PRESETS[preset] ||
      !key ||
      key.includes("..") ||
      key.includes("\\") ||
      key.startsWith("/") ||
      !ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      return new Response("Not found", { status: 404 });
    }

    const requireSigned = envBool(env.REQUIRE_SIGNED_URLS, false);
    if (requireSigned) {
      const secret = env.IMAGE_SIGNING_SECRET;
      if (!secret) return new Response("Misconfigured worker", { status: 500 });

      const exp = Number(url.searchParams.get("exp"));
      const sig = (url.searchParams.get("sig") || "").toLowerCase();
      const now = Math.floor(Date.now() / 1000);
      const maxTtl = Number(env.SIGNED_URL_MAX_TTL_SECONDS || 900);

      if (!Number.isInteger(exp) || exp <= now || exp > now + maxTtl || !/^[a-f0-9]{64}$/.test(sig)) {
        return new Response("Forbidden", { status: 403 });
      }

      const payload = `${preset}/${key}:${exp}`;
      const expected = await hmacHex(secret, payload);
      if (!timingSafeEqual(sig, expected)) {
        return new Response("Forbidden", { status: 403 });
      }
    }

    const fmt = acceptBucket(request.headers.get("accept") || "");
    const cacheKey = new Request(`${url.origin}/${preset}/${key}?fmt=${fmt}`, { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const source = `https://${env.SOURCE_HOST}/${key}`;
    const upstream = await fetch(source, {
      cf: {
        image: PRESETS[preset],
        cacheEverything: true,
        cacheTtl: CACHE_MAX_AGE_SECONDS,
      },
    });

    if (!upstream.ok) {
      return new Response("Not found", { status: 404 });
    }

    const response = new Response(upstream.body, upstream);
    response.headers.set("Cache-Control", `public, max-age=${CACHE_MAX_AGE_SECONDS}, immutable`);
    response.headers.set("Vary", "Accept");
    response.headers.set("X-Content-Type-Options", "nosniff");

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
```

## Checklist de rollout seguro

1. Deploy del Worker con el script de referencia (o equivalente estricto).
2. Confirmar `SOURCE_HOST` correcto.
3. Confirmar route `img.spacegurumis.lat/*`.
4. Confirmar DNS proxied para `img`.
5. Si usarás signed mode:
   - activar `IMAGE_DELIVERY_REQUIRE_SIGNED_URLS=true` en backend,
   - activar `REQUIRE_SIGNED_URLS=true` en Worker,
   - usar el mismo secreto en backend y Worker.
6. Validar en browser:
   - `https://img.spacegurumis.lat/detail/variants/<key-real>`
   - `https://img.spacegurumis.lat/thumb/variants/<key-real>`
   - `https://img.spacegurumis.lat/card/variants/<key-real>`
7. Ejecutar smoke: `frontend/docs/PRODUCT_DETAIL_IMAGE_DELIVERY_SMOKE.md`.
