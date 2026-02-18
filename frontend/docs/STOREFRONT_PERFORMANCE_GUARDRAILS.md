# Storefront Performance Guardrails

## Objetivo

Mantener la tienda publica rapida y estable durante el rediseño de Home, Shop y Product Detail.

## Guardrails activos

- SSR inicial en rutas criticas:
  - Home (`/`) entrega payload inicial de catalogo + slots.
  - Shop (`/shop`) entrega payload inicial de catalogo.
  - Product Detail (`/products/:slug`) entrega payload inicial de producto + SKU seleccionado.
- Sin doble fetch inicial en hidratacion:
  - Cobertura automatizada en `HomePage.test.tsx` y `ProductDetailPage.test.tsx`.
- Navegacion acelerada como mejora progresiva:
  - Prefetch en enlaces elegibles.
  - Fallback a navegacion nativa cuando JS no esta disponible.
- Priorizacion de media above-the-fold:
  - Home hero y main image de detail usan `loading="eager"`.
  - Cards y contenido bajo el pliegue usan `loading="lazy"`.
- Delivery transformado seguro en Product Detail:
  - Main image usa preset `detail` y miniaturas usan preset `thumb` cuando URL es elegible.
  - Si falta config o falla transform, fallback garantizado: `transformada -> original -> placeholder`.
- Estabilidad visual:
  - Galeria de Product Detail y miniaturas en formato `1:1` con `object-fit: contain` para evitar recorte/deformacion.
  - Contenedores de imagen con `aspect-ratio` en cards/galeria para reducir CLS.
- Evidencia de rutas runtime:
  - Cobertura SSR reachability en `coreRoutesReachability.test.ts`.

## Checklist minimo por PR

- `npm run test` en `frontend/` pasa completo.
- `npm run build` en `frontend/` pasa completo.
- Validacion manual usando `NAVIGATION_PERFORMANCE_SMOKE.md`.
- Validacion manual de galeria 1:1 y fallback usando `PRODUCT_DETAIL_IMAGE_DELIVERY_SMOKE.md`.
