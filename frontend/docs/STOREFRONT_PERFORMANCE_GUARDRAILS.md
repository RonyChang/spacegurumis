# Storefront Performance Guardrails

## Objetivo

Mantener la tienda publica rapida y estable durante el rediseño de Home, Shop y Product Detail.

## Guardrails activos

- Bootstrap de sesion publica sin flicker visible:
  - `BaseLayout` entrega snapshot SSR tri-state (`authenticated`/`guest`/`unknown`).
  - `PublicNavigation` evita mostrar acciones contradictorias mientras revalida perfil.
- SSR inicial en rutas criticas:
  - Home (`/`) entrega payload inicial de catalogo + slots.
  - Shop (`/shop`) entrega payload inicial de catalogo.
  - Product Detail (`/products/:slug`) entrega payload inicial de producto + SKU seleccionado.
- Sin doble fetch inicial en hidratacion:
  - Cobertura automatizada en `HomePage.test.tsx` y `ProductDetailPage.test.tsx`.
- Hero comercial de Home sin roundtrip dedicado:
  - El hero usa `meta.highlights.bestSeller` del mismo payload SSR de catalogo (`includeHighlights=true`).
  - Fallback determinista: highlight -> primera variante valida -> placeholder.
- Navegacion acelerada como mejora progresiva:
  - Prefetch en enlaces elegibles.
  - Fallback a navegacion nativa cuando JS no esta disponible.
- Alcance de navegacion acelerada ampliado:
  - Header + cards + footer help links (`/about`, `/contact`, `/care-instructions`, `/special-orders`).
- Priorizacion de media above-the-fold:
  - Home hero y main image de detail usan `loading="eager"`.
  - Cards y contenido bajo el pliegue usan `loading="lazy"`.
- Delivery transformado seguro en Product Detail:
  - Main image usa preset `detail` y miniaturas usan preset `thumb` cuando URL es elegible.
  - Preset `card` queda disponible para cards/listados sin params ad-hoc.
  - El comportamiento de letterbox/fondo se define en Worker (no en CSS de pagina).
  - Si falta config o falla transform, fallback garantizado: `transformada -> original -> placeholder`.
- Estabilidad visual:
  - Galeria de Product Detail y miniaturas en formato `1:1` con `object-fit: contain` para evitar recorte/deformacion.
  - Flechas prev/next de galeria en cliente sin dependencia de carrusel pesado.
  - Contenedores de imagen con `aspect-ratio` en cards/galeria para reducir CLS.
- Evidencia de rutas runtime:
  - Cobertura SSR reachability en `coreRoutesReachability.test.ts`.
- Frontera publica/admin reforzada:
  - Superficies publicas sin enlaces `/admin`.
  - `/admin` y `/admin/*` siguen protegidas por rol en cliente.

## Checklist minimo por PR

- `npm run test` en `frontend/` pasa completo.
- `npm run build` en `frontend/` pasa completo.
- Validacion manual usando `NAVIGATION_PERFORMANCE_SMOKE.md`.
- Validacion manual usando `STOREFRONT_SESSION_MOBILE_SPECIAL_ORDERS_SMOKE.md`.
- Validacion manual de galeria 1:1 y fallback usando `PRODUCT_DETAIL_IMAGE_DELIVERY_SMOKE.md`.
