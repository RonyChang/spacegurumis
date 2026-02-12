# R2 Images: Catalog Scopes and Presigned Uploads

Esta guia describe el flujo de subida directa a Cloudflare R2 con URL presignada y como se registra en backend para los distintos scopes de catalogo.

## Flujo base (presign + PUT + register)

1. Frontend admin solicita `presign` al backend.
2. Backend responde `uploadUrl` temporal + `imageKey`.
3. Frontend sube archivo con `PUT` directo a R2.
4. Frontend llama endpoint `register` para persistir metadata en Postgres.
5. Backend valida existencia del objeto via `HEAD` publico antes de guardar.

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
    "AllowedOrigins": ["https://spacegurumis.lat", "http://localhost:4321"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Registro: validaciones importantes

- `imageKey` debe respetar prefijo por scope (`categories/`, `products/`, `variants/`, `site/`).
- `contentType` y `byteSize` deben estar permitidos y coincidir con el objeto subido.
- Sin `R2_PUBLIC_BASE_URL` valido/publico, `register` falla.

## Troubleshooting rapido

- `403` en mutaciones admin: revisar sesion, rol admin y CSRF token/header.
- CORS falla en PUT: revisar origins/metodos/headers del bucket.
- `register` dice objeto inexistente: validar `R2_PUBLIC_BASE_URL` y acceso publico `HEAD`.
- Errores de pertenencia de scope: verificar que categoria/producto/variante seleccionados esten relacionados.
