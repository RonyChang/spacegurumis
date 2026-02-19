# Smoke Product Detail: Image Delivery 1:1 + Fallback + Gallery Arrows

## Objetivo

Validar que la galeria de `/products/:slug` mantiene frame cuadrado `1:1` sin deformar la imagen,
que los presets muestran la imagen completa con letterbox negro cuando corresponde,
y que el fallback de delivery funciona en cadena:
`transformada -> original -> placeholder`.

## Precondiciones

- Worker de imágenes activo en `img.spacegurumis.lat/*`.
- Variables frontend configuradas:
  - `PUBLIC_IMAGE_TRANSFORM_BASE_URL=https://img.spacegurumis.lat`
  - `PUBLIC_IMAGE_SOURCE_HOST=assets.spacegurumis.lat`
- Dataset con al menos 1 variante con:
  - imagen vertical
  - imagen horizontal
  - imagen cuadrada

## Flujo de validación

1. Abrir `/products/<slug>?sku=<sku_con_imagenes>`.
2. Confirmar que la imagen principal usa contenedor cuadrado (`1:1`) y no se estira.
3. Confirmar que miniaturas mantienen `1:1` para proporciones mixtas.
4. Cambiar de miniatura y validar que no hay salto de layout.
5. Si la imagen fuente no es cuadrada, confirmar franjas negras (arriba/abajo o lados) en transform.
6. Verificar flechas izquierda/derecha en la imagen principal cuando hay 2 o mas imagenes.
7. Click en flecha siguiente/anterior y confirmar sincronia con miniatura activa.
8. En desktop, enfocar la galeria principal y validar teclado (`ArrowLeft`/`ArrowRight`).
9. Confirmar que con una sola imagen no se muestran flechas interactivas.
10. Abrir Network y verificar request de imagen principal usando preset `detail`.
11. Verificar requests de miniaturas usando preset `thumb`.

## Smoke de fallback controlado

1. Simular falla del host transformado (por ejemplo bloquear `img.spacegurumis.lat` en DevTools o rule temporal).
2. Recargar Product Detail.
3. Confirmar que la imagen cae a URL original (`assets.spacegurumis.lat`) antes de placeholder.
4. Simular falla también del host original para una imagen.
5. Confirmar fallback final a `/placeholder-product.svg` sin romper layout.

## Criterio de PASS

- Galeria principal y miniaturas permanecen en `1:1` sin deformacion en desktop y mobile.
- Letterbox/pillarbox negro visible cuando la proporcion fuente no es cuadrada.
- Flechas de galeria funcionan con wrap-around y sincronia de miniaturas.
- No hay overflow horizontal en viewport mobile.
- Fallback funciona exactamente en el orden esperado.
- UI principal de compra (precio, cantidad, agregar al carrito, WhatsApp) sigue usable cuando hay fallback.

## Registro de evidencia (verify)

```text
Fecha: 2026-02-18
Ambiente: Produccion (https://spacegurumis.lat)
Desktop (1440x900): PASS - main y thumbs en 1:1, sin deformacion ni recorte forzado.
Mobile (390x844): PASS - sin overflow horizontal; compra y galeria usables.
Flechas galeria (click/tap): PASS - navegan con wrap-around y miniatura activa sincronizada.
Teclado gallery (ArrowLeft/ArrowRight): PASS - solo cuando el foco esta en la galeria.
Fallback transform->original->placeholder: PASS - validado en falla controlada del host transformado y luego original.
Capturas adjuntas:
- [x] vertical-1x1
- [x] horizontal-1x1
- [x] cuadrada-1x1
- [x] letterbox-negro-no-square
- [x] gallery-arrows-wrap-sync
- [x] fallback-transform-original-placeholder
Notas:
- Con worker activo, main usa preset `detail` y thumbs usan `thumb`.
- Worker `thumb/card/detail` usa `fit=contain` + `background=rgb(0,0,0)`.
- En falla de transform, la imagen recupera con URL original antes de placeholder.
```
