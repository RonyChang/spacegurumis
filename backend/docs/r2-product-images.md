# Product Images in Cloudflare R2 (Presigned PUT)

This backend supports uploading product images directly from the browser to Cloudflare R2 using a short-lived presigned `PUT` URL, then registering the image in Postgres so the Catalog API can expose `imageUrl` and `images[]`.

## Legacy Model Status

- Active model/table for product galleries: `ProductVariantImage` / `product_variant_images`.
- Legacy model/table: `ProductImage` / `product_images` (deprecated).
- New code and integrations MUST target variant images only.
- `product_images` is kept temporarily for migration/backward-compat visibility and should be removed in a dedicated cleanup change once there are no legacy dependencies.

## High-Level Flow

1. Frontend (admin) asks backend for a presigned upload URL.
2. Frontend uploads the file directly to R2 via `PUT` (browser -> R2).
3. Frontend calls backend to register the uploaded object (DB record).
4. Catalog endpoints start returning `imageUrl` / `images[]`, and the frontend renders thumbnails/gallery.

## Prerequisites

- A Cloudflare R2 bucket (public read via custom domain recommended).
- CORS configured on the bucket to allow browser `PUT`.
- Backend deployed with the R2 env vars set.
- Database updated with `schema.sql` (table `product_variant_images`).
- An admin session (cookie auth) to use the admin upload endpoints.

## Step 1: Create R2 Bucket

1. Cloudflare Dashboard -> R2 -> Create bucket.
2. Choose a final name (this becomes `R2_BUCKET`).

## Step 2: Configure Public Read (Custom Domain Recommended)

The backend derives the public URL like:

`publicUrl = R2_PUBLIC_BASE_URL + "/" + imageKey`

You should configure a custom domain for the bucket (or another public base URL) so objects are publicly reachable (and `HEAD` works).

Set:

- `R2_PUBLIC_BASE_URL=https://assets.spacegurumis.lat` (example)

Notes:

- The register step verifies the object exists using a public `HEAD` request to `publicUrl`.
- If the bucket/custom-domain is not public, registration will fail.

## Step 3: Configure CORS on the Bucket (Required for Browser Uploads)

You need CORS so the browser can `PUT` to the presigned URL.

Cloudflare Dashboard -> R2 -> your bucket -> Settings -> CORS.

Example CORS JSON (adjust origins as needed):

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

Notes:

- Keep the `AllowedOrigins` list as small as possible.
- If you upload from another domain (www, staging, etc) add it explicitly.

## Step 4: Backend Env Vars

Copy the R2 section from `spacegurumis/backend/.env.example` into your real `spacegurumis/backend/.env` (production secrets go here).

Minimum required:

```bash
R2_ACCOUNT_ID=...
R2_BUCKET=your-bucket-name
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_PUBLIC_BASE_URL=https://assets.spacegurumis.lat
```

Optional but recommended:

```bash
R2_PRESIGN_EXPIRES_SECONDS=120
R2_MAX_IMAGE_BYTES=5242880
R2_ALLOWED_IMAGE_CONTENT_TYPES=image/jpeg,image/png,image/webp,image/avif
```

Security notes:

- Never commit `R2_SECRET_ACCESS_KEY`.
- Presigned URLs are intentionally short-lived (60-300s).

## Step 5: Apply DB Schema

Run `spacegurumis/backend/schema.sql` on your Postgres database.

Example (adjust connection parameters):

```bash
psql "$DATABASE_URL" -f spacegurumis/backend/schema.sql
```

This creates the `product_variant_images` table and indexes.

## Step 6: Upload API Endpoints (Admin)

Routes (from `spacegurumis/backend/src/routes/admin.routes.js`):

- `POST /api/v1/admin/variants/:id/images/presign`
- `POST /api/v1/admin/variants/:id/images` (register)
- `GET /api/v1/admin/variants/:id/images`
- `PATCH /api/v1/admin/variants/:id/images/:imageId`
- `DELETE /api/v1/admin/variants/:id/images/:imageId`

Auth/CSRF:

- These are admin routes.
- Mutating methods require cookie auth + CSRF:
  - `authRequired` checks the HttpOnly access cookie.
  - `csrfRequired` checks:
    - request `Origin`/`Referer` is in `CSRF_ALLOWED_ORIGINS`
    - header `x-csrf-token` matches cookie `sg_csrf` (or whatever `CSRF_COOKIE_NAME` is set to)

### 6.1 Presign Request

Request body:

```json
{
  "contentType": "image/webp",
  "byteSize": 123456
}
```

Response `data` includes:

- `uploadUrl` (presigned PUT URL to R2)
- `imageKey` (example: `variants/123/<uuid>.webp`)
- `publicUrl` (derived from `R2_PUBLIC_BASE_URL`)
- `expiresInSeconds`
- `headers` (must be included in the PUT, at least `Content-Type`)

### 6.2 PUT Upload (Browser -> R2)

Use the returned `uploadUrl` and send `PUT` with the headers.

Example in JS:

```js
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': contentType,
  },
  body: file,
});
```

If CORS is wrong, the browser will fail before the request is sent.

### 6.3 Register (Persist in DB)

After the PUT succeeds, call register:

`POST /api/v1/admin/variants/:id/images`

Request body:

```json
{
  "imageKey": "variants/123/<uuid>.webp",
  "contentType": "image/webp",
  "byteSize": 123456,
  "altText": "Foto del peluche",
  "sortOrder": 0
}
```

Notes:

- `publicUrl` is derived by the backend. Client-provided URLs are ignored.
- The backend does a public `HEAD` to `publicUrl` to confirm the object exists.
- The backend also validates `contentType` and `byteSize` against the HEAD response (best-effort).

## Step 7: Verify Catalog Output

After registering at least 1 image:

- Variants list includes:
  - `imageUrl` (primary image URL)
- Variant/product detail includes:
  - `images[]` (gallery items sorted by `sortOrder`)

This should be visible in:

- `GET /api/v1/catalog/variants`
- `GET /api/v1/catalog/variants/:sku`
- `GET /api/v1/catalog/products/:slug`

## Site Decorative Assets (`site_assets`)

Besides variant galleries, the backend now supports decorative assets for home slots (for example `home-hero`, `home-banner`) using a dedicated table and API flow.

### Env and slot convention

- Slots are validated against `SITE_ASSET_ALLOWED_SLOTS` (comma-separated).
- Default slots if env is empty: `home-hero,home-banner`.
- Keys MUST use prefix `site/<slot>/...`.

### Admin endpoints (cookie auth + admin + CSRF on mutating methods)

- `POST /api/v1/admin/site-assets/presign`
- `POST /api/v1/admin/site-assets`
- `GET /api/v1/admin/site-assets?slot=<slot>` (slot is optional)
- `PATCH /api/v1/admin/site-assets/:id`
- `DELETE /api/v1/admin/site-assets/:id`

Presign request:

```json
{
  "slot": "home-hero",
  "contentType": "image/webp",
  "byteSize": 123456
}
```

Register request:

```json
{
  "slot": "home-hero",
  "title": "Hero principal",
  "altText": "Hero principal de home",
  "imageKey": "site/home-hero/<uuid>.webp",
  "contentType": "image/webp",
  "byteSize": 123456,
  "sortOrder": 0,
  "isActive": true,
  "startsAt": null,
  "endsAt": null
}
```

The register endpoint validates object existence with `HEAD` before persistence.

### Public slot endpoint

- `GET /api/v1/site-assets/:slot`

Returns only active and time-valid assets, ordered by `sortOrder` and `id`.

Example response item:

```json
{
  "id": 21,
  "slot": "home-hero",
  "title": "Hero principal",
  "altText": "Hero principal de home",
  "publicUrl": "https://assets.spacegurumis.lat/site/home-hero/abc.webp",
  "sortOrder": 0
}
```

## Troubleshooting

- Browser upload fails with CORS:
  - Re-check bucket CORS JSON.
  - Make sure the frontend origin is in `AllowedOrigins`.
- Register fails saying file does not exist:
  - Ensure `R2_PUBLIC_BASE_URL` is correct and public.
  - Ensure the custom domain/bucket allows `HEAD`.
- Register fails contentType/byteSize mismatch:
  - Ensure the PUT used the exact `Content-Type` from the presign response.
  - Ensure `byteSize` matches the real file size.
- 403 from admin endpoints:
  - You are not logged in as admin, or CSRF is missing/invalid.
  - Ensure `CSRF_ALLOWED_ORIGINS` includes your frontend origin (no trailing slash).
