# Smoke Product Detail: Image Delivery 1:1 + Fallback

## Objetivo

Validar que la galería de `/products/:slug` mantiene frame cuadrado `1:1` sin deformar la imagen y que el fallback de delivery funciona en cadena:
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
5. Abrir Network y verificar request de imagen principal usando preset `detail`.
6. Verificar requests de miniaturas usando preset `thumb`.

## Smoke de fallback controlado

1. Simular falla del host transformado (por ejemplo bloquear `img.spacegurumis.lat` en DevTools o rule temporal).
2. Recargar Product Detail.
3. Confirmar que la imagen cae a URL original (`assets.spacegurumis.lat`) antes de placeholder.
4. Simular falla también del host original para una imagen.
5. Confirmar fallback final a `/placeholder-product.svg` sin romper layout.

## Criterio de PASS

- Galería principal y miniaturas permanecen en `1:1` sin deformación en desktop y mobile.
- No hay overflow horizontal en viewport mobile.
- Fallback funciona exactamente en el orden esperado.
- UI principal de compra (precio, cantidad, agregar al carrito, WhatsApp) sigue usable cuando hay fallback.

## Registro de evidencia (completar en verify)

```text
Fecha:
Ambiente:
Desktop (1440x900): PASS|FAIL - notas
Mobile (390x844): PASS|FAIL - notas
Fallback transform->original->placeholder: PASS|FAIL - notas
Capturas adjuntas:
- [ ] vertical-1x1
- [ ] horizontal-1x1
- [ ] cuadrada-1x1
- [ ] fallback-transform-original-placeholder
```
