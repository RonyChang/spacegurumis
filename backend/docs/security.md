# Seguridad (cookie auth + CSRF + rate limit)

Este backend usa autenticacion **solo por cookies `HttpOnly`** (mejor para SSR y reduce el riesgo de robo del token por XSS).

- No se acepta `Authorization: Bearer <jwt>` en endpoints protegidos.
- El JWT de sesion vive en cookies `HttpOnly` y **no** se expone en respuestas JSON ni en URLs.

## Cookie auth (sesion via cookies)

**Cookies:**

- Access: `ACCESS_COOKIE_NAME` (default `sg_access`) con JWT `HttpOnly`.
- Refresh (opcional): `REFRESH_COOKIE_NAME` (default `sg_refresh`) con JWT `HttpOnly` si `AUTH_COOKIE_REFRESH_ENABLED=true`.
- CSRF: `CSRF_COOKIE_NAME` (default `sg_csrf`) **NO HttpOnly** para el mecanismo double-submit (ver CSRF).

**Donde se setean cookies:**

- `POST /api/v1/auth/login`.
- `POST /api/v1/auth/verify-email`.
- `POST /api/v1/auth/admin/verify-2fa`.
- `GET /api/v1/auth/google/callback` (antes de redirigir).
- `POST /api/v1/auth/refresh` (si refresh esta habilitado).
- `POST /api/v1/auth/logout` limpia cookies (access/refresh/csrf).

## Variables de entorno

Estas variables estan documentadas en `spacegurumis/backend/.env.example`.

**Contrato estricto de arranque (obligatorias):**

- `PORT`
- `NODE_ENV` (`development`, `test` o `production`)
- `DATABASE_URL` (postgres/postgresql)
- `JWT_SECRET`
- `CORS_ALLOWED_ORIGINS` (CSV con al menos un origin)
- `CSRF_ALLOWED_ORIGINS` (CSV con al menos un origin)

Si alguna falta o es invalida, el backend falla en arranque con error de validacion.

**Reverse proxy:**

- `TRUST_PROXY`: `true` cuando corres detras de Dokploy/Nginx (usa `X-Forwarded-For`/`X-Forwarded-Proto`).

**Cookie auth:**

- `ACCESS_COOKIE_NAME`, `REFRESH_COOKIE_NAME`, `CSRF_COOKIE_NAME`
- `COOKIE_SECURE`: recomendado `true` en produccion (HTTPS).
- `COOKIE_SAMESITE`: `lax` recomendado para SSR y reduce CSRF.
- `COOKIE_DOMAIN`: opcional (solo si necesitas compartir cookies entre subdominios).
- `COOKIE_PATH`: default `/`.
- `AUTH_COOKIE_ACCESS_EXPIRES_IN`: si vacio, usa `JWT_EXPIRES_IN`.
- `AUTH_COOKIE_REFRESH_ENABLED`: `true|false`.
- `AUTH_COOKIE_REFRESH_EXPIRES_IN`

No se soportan aliases legacy `AUTH_COOKIE_*` para nombres/atributos base de cookies.

**CSRF:**

- `CSRF_ALLOWED_ORIGINS`: allowlist de origins (coma-separado, sin `/` al final), sin fallback implicito.
- `CSRF_REQUIRE_TOKEN`: `true` (recomendado). Requiere `X-CSRF-Token` que coincida con cookie `sg_csrf`.

**Rate limit (auth):**

- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_LOGIN_MAX`
- `AUTH_RATE_LIMIT_REGISTER_MAX`
- `AUTH_RATE_LIMIT_VERIFY_EMAIL_MAX`
- `AUTH_RATE_LIMIT_RESEND_MAX`
- `AUTH_RATE_LIMIT_ADMIN_2FA_MAX`
- `AUTH_RATE_LIMIT_REFRESH_MAX`

## CSRF (solo para cookie auth)

CSRF se aplica **solo** cuando:

- El metodo es mutante: `POST`, `PUT`, `PATCH`, `DELETE`
- Y el request es autenticado (se ejecuta despues de `authRequired`).

**Validaciones:**

1. Valida `Origin` (o fallback `Referer`) contra `CSRF_ALLOWED_ORIGINS`.
2. Si `CSRF_REQUIRE_TOKEN=true`: valida double-submit.
   - Cookie `CSRF_COOKIE_NAME` (por defecto `sg_csrf`)
   - Header `X-CSRF-Token`
   - Deben coincidir exactamente.

**Frontend (cuando migres a cookie auth):**

- Todas las mutaciones deben incluir `X-CSRF-Token` con el valor de la cookie `sg_csrf`.
- Ejemplo:

```ts
function getCookie(name: string) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function apiFetch(url: string, init: RequestInit = {}) {
  const csrf = getCookie('sg_csrf');
  const headers = new Headers(init.headers);
  if (csrf) headers.set('X-CSRF-Token', csrf);

  return fetch(url, {
    ...init,
    headers,
    credentials: 'include', // necesario para enviar cookies cross-origin
  });
}
```

## Rate limiting (auth)

Se aplica rate limiting in-memory a endpoints sensibles de auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/verify-email`
- `POST /api/v1/auth/resend-verification`
- `POST /api/v1/auth/admin/verify-2fa`
- `POST /api/v1/auth/refresh` (si esta habilitado)

Cuando se excede el limite, responde `429` y agrega `Retry-After`.

## Security headers

El middleware `spacegurumis/backend/src/middlewares/securityHeaders.js` agrega headers base para la API:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` minimal para API

En produccion, normalmente se agrega **HSTS** a nivel de reverse proxy (Nginx/Dokploy) en vez de la app.

## Admin routes hardening

Las rutas de administracion (`/api/v1/admin/*`) usan doble control:

- autenticacion por cookie (`authRequired`)
- autorizacion por rol (`adminRequired`)

Adicionalmente, mutaciones admin (`POST/PATCH/DELETE`) usan `csrfRequired`.

Endpoints principales documentados en:

- `spacegurumis/backend/docs/admin-console-api.md`
- `spacegurumis/backend/docs/r2-product-images.md` (imagenes de variantes y site assets)

## Reverse proxy (Dokploy/Nginx)

Recomendacion en produccion:

- `TRUST_PROXY=true` en el backend.
- Asegurar que el proxy agregue:
  - `X-Forwarded-For` (IP real para rate limit/logs)
  - `X-Forwarded-Proto: https` (si TLS termina en el proxy)
- Si `COOKIE_SECURE=true`, el navegador solo enviara cookies por HTTPS (correcto).

## CORS y cookies

El backend tiene `credentials: true` en CORS. Para usar cookies desde el frontend cuando sea cross-origin (por ejemplo, `http://localhost:4321` -> `http://localhost:3000`), tu `fetch` debe usar:

- `credentials: 'include'`

El allowlist de CORS se configura con `CORS_ALLOWED_ORIGINS` (CSV) y es obligatorio en arranque. En produccion, configuralo solo con tus dominios publicos.

## Manual smoke-test checklist

1. **Login setea cookies**
   - `POST /api/v1/auth/login`
   - Verifica `Set-Cookie` incluye `sg_access` y `sg_csrf` (y `sg_refresh` si refresh habilitado).

2. **Cookie auth funciona en un endpoint protegido**
   - Con cookies del paso anterior:
   - `GET /api/v1/profile` debe responder `200`.

3. **CSRF bloquea mutaciones con cookie auth**
   - Con cookies:
   - `POST /api/v1/orders` SIN `X-CSRF-Token` debe responder `403`.

4. **CSRF permite mutaciones con token correcto**
   - Envia `X-CSRF-Token` igual al valor de cookie `sg_csrf`.
   - El mismo `POST /api/v1/orders` debe pasar la capa CSRF (si lo demas es valido).

5. **Rate limit 429**
   - Repite `POST /api/v1/auth/login` mas veces que `AUTH_RATE_LIMIT_LOGIN_MAX` dentro de la ventana.
   - Debe responder `429` y tener `Retry-After`.

6. **Google OAuth**
   - Completa el flujo `GET /api/v1/auth/google`.
   - En el callback, verifica que setea cookies y redirige a `/login` **sin** `token` en query/hash.

7. **Admin 2FA**
   - Login con admin -> debe pedir 2FA.
   - `POST /api/v1/auth/admin/verify-2fa` debe setear cookies.
