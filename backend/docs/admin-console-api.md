# Admin Console API

Esta guia documenta las rutas usadas por la consola `/admin` para gestion de usuarios admin, catalogo y codigos de descuento.

## Seguridad requerida

Todas las rutas estan bajo `/api/v1/admin/*` y aplican:

- `authRequired` (sesion por cookies HttpOnly).
- `adminRequired` (rol `admin`).
- `csrfRequired` para mutaciones (`POST/PATCH/DELETE`).

En frontend, las mutaciones deben enviar header `X-CSRF-Token` igual al valor de cookie `sg_csrf`.

## 1) Admin users

### GET `/api/v1/admin/users`

Retorna listado de cuentas admin con campos seguros para gestion.

Respuesta (`data[]`):

```json
{
  "id": 1,
  "email": "admin@spacegurumis.lat",
  "firstName": "Admin",
  "lastName": "Owner",
  "role": "admin",
  "isActive": true,
  "emailVerifiedAt": "2026-02-11T00:00:00.000Z",
  "createdAt": "2026-02-11T00:00:00.000Z",
  "updatedAt": "2026-02-11T00:00:00.000Z"
}
```

### POST `/api/v1/admin/users`

Soporta dos flujos:

- Crear admin nuevo.
- Promover usuario existente por email.

Payload:

```json
{
  "email": "nuevo-admin@spacegurumis.lat",
  "password": "Secret1234",
  "firstName": "Nuevo",
  "lastName": "Admin"
}
```

Respuesta:

```json
{
  "action": "created",
  "user": { "id": 2, "email": "nuevo-admin@spacegurumis.lat", "role": "admin" }
}
```

Errores comunes:

- `400` payload invalido (email/password/nombres).
- `409` el usuario ya es admin.

## 2) Admin catalog

### GET `/api/v1/admin/catalog/categories`

Lista categorias para formularios admin.

### POST `/api/v1/admin/catalog/categories`

Crea categoria nueva para flujo admin guiado.

Payload:

```json
{
  "name": "Amigurumis",
  "slug": "amigurumis",
  "description": "Categoria de prueba",
  "isActive": true
}
```

Errores comunes:

- `400` validaciones (`name`/`slug` requeridos).
- `409` slug o nombre duplicado.

### DELETE `/api/v1/admin/catalog/categories/:id`

Elimina categoria por alcance, junto con su arbol dependiente de catalogo:

- productos de esa categoria;
- variantes de esos productos;
- inventarios y imagenes de variantes;
- imagenes legacy de producto.

Respuesta `data` incluye contadores de eliminacion por tipo.

### GET `/api/v1/admin/catalog/products`

Lista productos con variantes e inventario resumido.

### POST `/api/v1/admin/catalog/products`

Alta transaccional:

- Crea `product`.
- Crea variante inicial.
- Crea inventario inicial.

Payload:

```json
{
  "categoryId": 10,
  "name": "Amigurumi Panda",
  "slug": "amigurumi-panda",
  "description": "Peluche tejido",
  "isActive": true,
  "sku": "PANDA-001",
  "variantName": "Clasico",
  "price": 79.9,
  "initialStock": 6,
  "weightGrams": 320,
  "sizeLabel": "M"
}
```

Errores comunes:

- `409` slug o sku duplicado.
- `400` validaciones.

### PATCH `/api/v1/admin/catalog/products/:id`

Actualiza metadatos del producto (`name`, `slug`, `description`, `isActive`, `categoryId`).

### DELETE `/api/v1/admin/catalog/products/:id`

Elimina el producto completo con variantes y registros dependientes.

Respuesta `data` incluye contadores de eliminacion por tipo.

### POST `/api/v1/admin/catalog/products/:id/variants`

Crea variante adicional con inventario inicial opcional.

### PATCH `/api/v1/admin/catalog/variants/:id`

Actualiza metadatos de variante (`sku`, `variantName`, `price`, `weightGrams`, `sizeLabel`).

### PATCH `/api/v1/admin/catalog/variants/:id/stock`

Actualiza stock total de variante (valida que no sea menor a `reserved`).

### DELETE `/api/v1/admin/catalog/variants/:id`

Elimina solo la variante seleccionada con sus dependencias (inventario, imagenes y cart items).

Respuesta `data` incluye contadores de eliminacion por tipo.

Nota:

- `GET /api/v1/admin/catalog/products` retorna `id`, `name` y `slug` por producto para desambiguacion en selectores (`name (slug)`).

## 3) Imagenes de variantes (R2)

La consola admin reutiliza el flujo existente:

- `POST /api/v1/admin/variants/:id/images/presign`
- `POST /api/v1/admin/variants/:id/images`
- `GET /api/v1/admin/variants/:id/images`
- `PATCH /api/v1/admin/variants/:id/images/:imageId`
- `DELETE /api/v1/admin/variants/:id/images/:imageId`

Referencia completa: `spacegurumis/backend/docs/r2-product-images.md`.

## 4) Admin discounts

### GET `/api/v1/admin/discounts`

Lista codigos de descuento para gestion administrativa.

Campos devueltos por item:

- `id`
- `code`
- `percentage`
- `isActive`
- `startsAt`
- `expiresAt`
- `maxUses`
- `usedCount`
- `minSubtotal` (en soles)

### POST `/api/v1/admin/discounts`

Crea codigo de descuento con reglas opcionales.

Payload:

```json
{
  "code": "WELCOME10",
  "percentage": 10,
  "isActive": true,
  "startsAt": "2026-02-11T00:00:00.000Z",
  "expiresAt": "2026-03-01T00:00:00.000Z",
  "maxUses": 100,
  "minSubtotal": 50
}
```

Errores comunes:

- `400` reglas invalidas (`percentage`, fechas, `maxUses`, `minSubtotal`).
- `409` codigo ya existe.

## 5) Checklist de despliegue admin (produccion)

1. Configurar cookies seguras:
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=lax` (o estrategia definida)
- `TRUST_PROXY=true` si estas detras de Nginx/Dokploy.

2. Configurar CSRF:
- `CSRF_ALLOWED_ORIGINS=https://spacegurumis.lat,https://www.spacegurumis.lat`
- `CSRF_REQUIRE_TOKEN=true`

3. Confirmar CORS:
- `CORS_ALLOWED_ORIGINS=https://spacegurumis.lat,https://www.spacegurumis.lat`

4. Confirmar R2:
- `R2_*` completo y `R2_PUBLIC_BASE_URL` valido.
- CORS del bucket habilitado para `PUT`.

5. Bootstrapping de admin:
- Verificar que exista al menos un usuario con rol `admin`.
- Si no existe, crear/promover uno por flujo controlado antes de abrir `/admin`.

6. Smoke test previo a release:
- Login admin y acceso `/admin`.
- Crear admin nuevo.
- Crear categoria nueva.
- Crear producto + variante inicial.
- Crear variante en producto existente.
- Borrar por alcance: categoria, producto, variante.
- Crear codigo de descuento.
- Subir/registrar imagen de variante.
- Verificar detalle publico en `/products/<slug>?sku=<sku>`.
