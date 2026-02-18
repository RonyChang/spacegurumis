# Home Hero WhatsApp CTA Smoke

Fecha de registro: 2026-02-17
Fecha de ejecucion: 2026-02-18
Scope: Home hero (`/`) con CTA de pedidos especiales en primer viewport.

## Entorno

- Frontend: `spacegurumis/frontend`
- Ruta: `/`
- Viewports objetivo:
- Desktop: 1440x900
- Mobile: 390x844

## Checklist de validacion

### 1) Hero y fallback visual
- [x] El hero principal muestra bloque de pedidos especiales en primer viewport.
- [x] Si slot `home-hero` no retorna data, se usa `/pedidos-especiales.jpeg`.
- [x] No hay dependencia visible de banner secundario para CTA principal.

### 2) CTA y redireccion WhatsApp
- [x] Se renderiza el texto: `Haz tu pedido aquí, contáctanos por wsp con tu pedido especial para cotizar :)`.
- [x] El boton `Contactar por WhatsApp` abre enlace `wa.me` válido.
- [x] Si no existe URL de WhatsApp, se muestra estado `WhatsApp no disponible` sin romper layout.

### 3) Legibilidad y layout
- [x] Desktop: tipografia legible y CTA visible sin solapamientos.
- [x] Mobile: tipografia legible, CTA usable, sin overflow horizontal.
- [x] Layout de colecciones y favoritos permanece estable bajo el hero.

## Evidencia

- Captura desktop: validacion manual realizada (sin adjunto en repo).
- Captura mobile: validacion manual realizada (sin adjunto en repo).
- Resultado final: `PASS`

## Criterio de aceptacion

Se considera PASS cuando los tres bloques (hero/fallback, CTA/redireccion, legibilidad/layout) están marcados completos en desktop y mobile.
