# R2 Images: Catalog Scopes and Presigned Uploads

Esta guia describe el flujo de subida directa a Cloudflare R2 con URL presignada y como se registra en backend para los distintos scopes de catalogo.

## Flujo base (presign + PUT + register)

1. Frontend admin solicita `presign` al backend.
2. Backend responde contrato completo de subida: `uploadUrl`, `imageKey`, `publicUrl`, `expiresInSeconds`.
3. Frontend sube archivo con `PUT` directo a R2.
4. Frontend llama endpoint `register` para persistir metadata en Postgres.
5. Backend valida existencia del objeto via `HEAD` publico antes de guardar.

Cada etapa debe diagnosticarse por separado:

- `presign`: valida auth/csrf y configuracion R2 del backend.
- `PUT`: valida CORS del bucket + conectividad browser.
- `register`: valida que el objeto exista y metadata coincida.

## Scopes soportados y cardinalidad

| Scope | Entidad | Cardinalidad |
|---|---|---|
| Categoria | `categories/:id` | 1 imagen efectiva |
| Producto | `products/:id` | 1 imagen efectiva |
| Variante | `variants/:id` | Galeria multiple |
| Site assets | `site_assets` | Multiple por slot |

Reglas:

- Categoria/producto: registrar imagen nueva reemplaza la anterior en transaccion.
- Variante: cada imagen se maneja de forma independiente (add/update/delete por item).

## Endpoints admin de imagenes catalogo

Todos bajo cookie auth + admin + CSRF en mutaciones.

### Categoria (imagen unica)

- `POST /api/v1/admin/categories/:id/images/presign`
- `POST /api/v1/admin/categories/:id/images`
- `GET /api/v1/admin/categories/:id/images`
- `PATCH /api/v1/admin/categories/:id/images/:imageId`
- `DELETE /api/v1/admin/categories/:id/images/:imageId`

### Producto (imagen unica)

- `POST /api/v1/admin/products/:id/images/presign?categoryId=<opcional>`
- `POST /api/v1/admin/products/:id/images?categoryId=<opcional>`
- `GET /api/v1/admin/products/:id/images?categoryId=<opcional>`
- `PATCH /api/v1/admin/products/:id/images/:imageId?categoryId=<opcional>`
- `DELETE /api/v1/admin/products/:id/images/:imageId?categoryId=<opcional>`

### Variante (galeria)

- `POST /api/v1/admin/variants/:id/images/presign?productId=<opcional>&categoryId=<opcional>`
- `POST /api/v1/admin/variants/:id/images?productId=<opcional>&categoryId=<opcional>`
- `GET /api/v1/admin/variants/:id/images?productId=<opcional>&categoryId=<opcional>`
- `PATCH /api/v1/admin/variants/:id/images/:imageId?productId=<opcional>&categoryId=<opcional>`
- `DELETE /api/v1/admin/variants/:id/images/:imageId?productId=<opcional>&categoryId=<opcional>`

Si se envia contexto padre (`categoryId`/`productId`), backend valida pertenencia y rechaza cruces inconsistentes.

## Site assets (decorativos)

Para decoracion de frontend (hero/banner), usar `site_assets`.

- `POST /api/v1/admin/site-assets/presign`
- `POST /api/v1/admin/site-assets`
- `GET /api/v1/admin/site-assets?slot=<slot>`
- `PATCH /api/v1/admin/site-assets/:id`
- `DELETE /api/v1/admin/site-assets/:id`

Publico:

- `GET /api/v1/site-assets/:slot`

## Variables de entorno relevantes

Backend (`.env`):

```bash
R2_ACCOUNT_ID=...
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_REGION=auto
R2_BUCKET=spacegurumis
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BASE_URL=https://assets.spacegurumis.lat

R2_PRESIGN_EXPIRES_SECONDS=120
R2_ALLOWED_IMAGE_CONTENT_TYPES=image/jpeg,image/png,image/webp,image/avif
R2_MAX_IMAGE_BYTES=5242880
```

Para site assets:

```bash
SITE_ASSET_ALLOWED_SLOTS=home-hero,home-banner
```

## CORS en bucket R2 (browser PUT)

Ejemplo (ajusta origins):

```json
[
  {
    "AllowedOrigins": ["https://spacegurumis.lat", "https://www.spacegurumis.lat", "http://localhost:4321"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Notas:

- Si usas `PUBLIC_API_BASE_URL` vacio (same-origin), esto no cambia el `PUT` a R2: igual depende del CORS del bucket.
- Si cambias dominio frontend o subdominio `www`, agregalo explicitamente en `AllowedOrigins`.

## Registro: validaciones importantes

- `imageKey` debe respetar prefijo por scope (`categories/`, `products/`, `variants/`, `site/`).
- `contentType` y `byteSize` deben estar permitidos y coincidir con el objeto subido.
- Sin `R2_PUBLIC_BASE_URL` valido/publico, `register` falla.

## Smoke checklist (reproducible)

1. **Presign OK**
   - `POST /api/v1/admin/variants/:id/images/presign`
   - Esperado: `200` y `data.uploadUrl`, `data.imageKey`, `data.publicUrl`, `data.expiresInSeconds`.

2. **PUT a R2 OK**
   - Ejecutar `PUT` del archivo a `uploadUrl` con header `Content-Type` correspondiente.
   - Esperado: `2xx` desde R2 sin error CORS en DevTools.

3. **Register OK**
   - `POST /api/v1/admin/variants/:id/images` con `imageKey`, `contentType`, `byteSize`.
   - Esperado: `201` y metadata persistida.

4. **Validacion de lectura**
   - `GET /api/v1/admin/variants/:id/images` debe incluir la imagen nueva.
   - El modulo admin debe renderizar la imagen en la lista del scope.

5. **Escenario de fallo controlado**
   - Forzar error CORS (origin no permitido) o `uploadUrl` vencida.
   - Esperado: frontend reporta falla en etapa upload (`PUT`) y no intenta `register`.

## Troubleshooting rapido

- `403` en mutaciones admin: revisar sesion, rol admin y CSRF token/header.
- `presign` falla: revisar `R2_ENDPOINT`, `R2_BUCKET`, credenciales y `R2_PUBLIC_BASE_URL` en backend.
- CORS falla en PUT: revisar `AllowedOrigins`, `AllowedMethods`, `AllowedHeaders` del bucket.
- `register` dice objeto inexistente: validar que el `PUT` realmente llego a R2 y que `R2_PUBLIC_BASE_URL` permite `HEAD`.
- Errores de pertenencia de scope: verificar que categoria/producto/variante seleccionados esten relacionados.
- `NetworkError when attempting to fetch resource` en navegador:
  - si ocurre en llamada a API admin (`/api/v1/admin/...`): revisar `PUBLIC_API_BASE_URL` y CORS backend.
  - si ocurre en `uploadUrl` de R2: revisar CORS bucket + conectividad + URL expirada.

## Evidencia de smoke manual (2026-02-18)

Ambiente validado:

- Frontend admin: `https://spacegurumis.lat/admin/imagenes`
- Scope: variante de producto
- Bucket R2 con CORS browser `PUT` habilitado para dominio productivo

Resultado por etapa:

1. **Presign**: `PASS` (`200`) con contrato completo (`uploadUrl`, `imageKey`, `publicUrl`, `expiresInSeconds`).
2. **PUT**: `PASS` (`2xx`) a R2 sin error CORS en DevTools.
3. **Register**: `PASS` (`201`) y metadata persistida.
4. **Lectura admin**: `PASS` (la imagen aparece en listado del scope y renderiza en modulo).
5. **Fallo controlado PUT**: `PASS` (mensaje stage-aware de upload y sin intento de `register`).

Evidencia revisada:

- Network tab con requests `presign -> PUT -> register` exitosos.
- Network tab con simulacion de fallo `PUT` (sin request `register` subsecuente).
