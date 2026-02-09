# Frontend Guide (Astro SSR)

Este frontend vive en `spacegurumis/frontend/` y ahora corre como **SSR en Node** (Astro + Node adapter). No es un sitio estatico servido por `nginx.conf` como antes.

## 1) Estructura del proyecto

- `src/pages/*.astro`: rutas SSR (una por pagina).
- `src/layouts/BaseLayout.astro`: layout global con header/footer (nav).
- `src/components/pages/*.tsx`: React islands por pantalla (interactividad).
- `src/components/ui/*.tsx`: componentes UI reusables (Button, TextField, Alert).
- `src/lib/api/*`: cliente API (fetch + manejo de errores + endpoints).
- `src/lib/session/*`: helpers de sesion (afterLogin/logout) + flash messages (sin token en storage).
- `src/lib/cart/*`: carrito guest (`localStorage.guestCart`) + sync al iniciar sesion.
- `src/styles/global.css`: tokens + estilos base + componentes.
- `legacy-static/`: frontend anterior (se conserva como referencia/rollback).

## 2) SSR en Astro: pages vs islands (React)

- **Pages (Astro)**: entregan HTML desde el servidor para rutas como `/`, `/login`, etc.
- **Islands (React)**: se hidratan en el navegador para manejar estado, `localStorage`, formularios y llamadas a la API.

### Auth (cookies + CSRF)

La autenticacion ahora usa **cookies HttpOnly** (emitidas por el backend) en vez de guardar un JWT en `localStorage`.

Implicancias:
- Mejor seguridad: el token no es accesible desde JS (reduce impacto ante XSS).
- Compatible con SSR: si en el futuro haces fetch server-side, puedes reenviar el header `Cookie` del request.

Para requests mutables (`POST/PUT/PATCH/DELETE`) el frontend envia `X-CSRF-Token` leyendo la cookie `sg_csrf` (double-submit). Esto esta centralizado en `src/lib/api/client.ts`.

Refresh (recomendado): el API client intenta `POST /api/v1/auth/refresh` cuando un request protegido falla con `401` (solo una vez por request, con single-flight). Para que funcione en prod, habilita refresh cookies en el backend (`AUTH_COOKIE_REFRESH_ENABLED=true`).

Nota: muchas pantallas privadas siguen usando **guard client-side** (por simplicidad), pero ya no dependen de storage de tokens.

## 3) Rutas

Rutas principales (paridad con el frontend anterior):
- `/` catálogo + detalle (en la misma pagina)
- `/login`
- `/register`
- `/verify`
- `/admin-2fa`
- `/profile`
- `/cart`
- `/orders`

## 4) Variables de entorno (.env) y `PUBLIC_*`

Astro expone al navegador solo variables que empiezan con `PUBLIC_`.

Archivo de referencia: `spacegurumis/frontend/.env.example`

Variables clave:
- `PUBLIC_API_BASE_URL`:
  - Vacío: modo **same-origin** (recomendado con reverse proxy). El browser llama `/api/v1/...`.
  - Con valor (ej. `https://api.ejemplo.com`): modo **cross-origin**. El browser llama `https://api.ejemplo.com/api/v1/...`.
- `PUBLIC_WHATSAPP_NUMBER`, `PUBLIC_WHATSAPP_TEMPLATE`, `PUBLIC_WHATSAPP_ORDER_TEMPLATE`:
  - Configuran los links/mensajes de WhatsApp.

## 5) Desarrollo local

### Comandos

En una terminal:

```bash
cd spacegurumis/backend
npm install
npm run dev
```

En otra terminal:

```bash
cd spacegurumis/frontend
npm install
npm run dev
```

### Proxy /api en dev (sin CORS)

Para evitar CORS, este frontend usa **same-origin** en dev y hace proxy de `/api/*` al backend (ver `spacegurumis/frontend/astro.config.mjs`).

Recomendado en dev:
- `PUBLIC_API_BASE_URL=` (vacio)
- backend en `http://localhost:3000`
- frontend en `http://localhost:4321`

## 6) Produccion (build + start)

Build SSR:

```bash
cd spacegurumis/frontend
npm run build
```

Start SSR:

```bash
cd spacegurumis/frontend
npm run start
```

El server SSR escucha en `PORT` (por defecto `4321`).

## 7) Nginx reverse proxy (recomendado)

Con SSR ya no aplica el `nginx.conf` viejo tipo SPA fallback (porque ya no existe `index.html` como entrypoint).

En produccion, lo comun es:
- Nginx adelante como **reverse proxy**
- `/` -> frontend SSR (Node)
- `/api/*` -> backend

Config de referencia: `spacegurumis/infra/nginx/spacegurumis-reverse-proxy.conf`

Headers recomendados:
- `X-Forwarded-For`
- `X-Forwarded-Proto`
- `X-Forwarded-Host`

## 8) Checklist de paridad funcional (manual smoke)

Catalogo
- [ ] `/` lista variantes (paginacion funciona)
- [ ] ver detalle por SKU desde "Ver detalle"
- [ ] agregar al carrito como guest (se refleja en `/cart`)

Auth
- [ ] `/register` -> redirige a `/verify`
- [ ] `/verify` verifica con codigo 6 digitos y redirige a `/profile`
- [ ] `/login` login ok -> `/profile`
- [ ] login con email no verificado -> `/verify`
- [ ] login admin -> `/admin-2fa`
- [ ] "Continuar con Google" inicia OAuth y vuelve a `/login` (sin `#token=...`; el frontend valida sesion via cookies)
- [ ] logout: `POST /api/v1/auth/logout` limpia cookies y vuelve a estado logged-out

Carrito + descuentos + ordenes
- [ ] `/cart` guest: actualizar qty, eliminar, vaciar
- [ ] login con guest cart: items se sincronizan al backend (si falla parcial, se conservan fallidos)
- [ ] `/cart` auth: cargar backend cart, actualizar qty, eliminar, vaciar
- [ ] validar cupón (`/api/v1/discounts/validate`)
- [ ] crear orden (`/api/v1/orders`) requiere direccion en `/profile`
- [ ] iniciar pago Stripe (`/api/v1/payments/stripe/session`) redirige a `checkoutUrl`

Pedidos
- [ ] `/orders` lista pedidos
- [ ] ver detalle de pedido
- [ ] link WhatsApp en pedido/detalle (si está configurado)

Seguridad (manual)
- [ ] en DevTools > Network: requests no envian `Authorization: Bearer ...`
- [ ] en DevTools > Network: requests mutables incluyen `X-CSRF-Token` y no fallan por CSRF
