# Admin Console API

Guia operativa para la consola admin modular en frontend y sus contratos backend bajo `/api/v1/admin/*`.

## Frontend admin modular (`/admin/*`)

Rutas de pantalla:

- `/admin` (hub de modulos)
- `/admin/usuarios-admin`
- `/admin/catalogo`
- `/admin/imagenes`
- `/admin/descuentos`

Todas estas rutas usan el mismo guard de sesion admin (cookies + perfil) y mantienen deep-link directo.

## Seguridad requerida

Todas las rutas backend de este documento aplican:

- `authRequired` (sesion por cookies HttpOnly).
- `adminRequired` (rol `admin`).
- `csrfRequired` para mutaciones (`POST`, `PATCH`, `DELETE`).

Mutaciones desde frontend deben enviar `X-CSRF-Token` con el valor de la cookie CSRF.

## 1) Usuarios admin

### GET `/api/v1/admin/users`

Lista usuarios con rol admin.

### POST `/api/v1/admin/users`

Crea admin nuevo o promueve usuario existente por email.

Payload ejemplo:

```json
{
  "email": "nuevo-admin@spacegurumis.lat",
  "password": "Secret1234",
  "firstName": "Nuevo",
  "lastName": "Admin"
}
```

### DELETE `/api/v1/admin/users/:id`

Remueve privilegios admin del usuario destino (democion de rol), sin borrado fisico.

Reglas:

- No se permite remover al ultimo admin activo.
- Respuesta tipica:

```json
{
  "action": "demoted",
  "user": {
    "id": 2,
    "email": "nuevo-admin@spacegurumis.lat",
    "role": "customer"
  }
}
```

Errores comunes:

- `400` id invalido.
- `404` usuario no encontrado.
- `409` intento de dejar sistema sin admin activo.

## 2) Catalogo admin

### GET `/api/v1/admin/catalog/categories`

Lista categorias para selectores admin.

### POST `/api/v1/admin/catalog/categories`

Crea categoria.

### PATCH `/api/v1/admin/catalog/categories/:id`

Actualiza metadata de categoria (`name`, `slug`, `description`, `isActive`).

### DELETE `/api/v1/admin/catalog/categories/:id`

Elimina categoria + arbol dependiente (productos, variantes, inventario, imagenes, cart items).

Respuesta incluye resumen de contadores borrados.

### GET `/api/v1/admin/catalog/products`

Lista productos con variantes + inventario resumido.

### POST `/api/v1/admin/catalog/products`

Crea producto + variante inicial + inventario inicial (transaccional).

### PATCH `/api/v1/admin/catalog/products/:id`

Actualiza metadata de producto (`categoryId`, `name`, `slug`, `description`, `isActive`).

### DELETE `/api/v1/admin/catalog/products/:id?categoryId=<id-opcional>`

Elimina producto completo con sus dependencias.

Si `categoryId` se envia, backend valida pertenencia antes de borrar.

### POST `/api/v1/admin/catalog/products/:id/variants`

Crea variante adicional.

### PATCH `/api/v1/admin/catalog/variants/:id`

Actualiza metadata de variante.

### PATCH `/api/v1/admin/catalog/variants/:id/stock`

Actualiza stock de variante.

### DELETE `/api/v1/admin/catalog/variants/:id?productId=<id-opcional>&categoryId=<id-opcional>`

Elimina solo la variante.

Si se envia contexto padre (`productId`, `categoryId`), backend valida pertenencia antes de borrar.

## 3) Imagenes admin por scope

### Reglas de cardinalidad

- Categoria: 1 imagen efectiva.
- Producto: 1 imagen efectiva.
- Variante: multiples imagenes (galeria).

Cuando scope es de imagen unica (categoria/producto), registrar una nueva imagen reemplaza la anterior en transaccion.

### Scope categoria

- `POST /api/v1/admin/categories/:id/images/presign`
- `POST /api/v1/admin/categories/:id/images`
- `GET /api/v1/admin/categories/:id/images`
- `PATCH /api/v1/admin/categories/:id/images/:imageId`
- `DELETE /api/v1/admin/categories/:id/images/:imageId`

### Scope producto

- `POST /api/v1/admin/products/:id/images/presign?categoryId=<id-opcional>`
- `POST /api/v1/admin/products/:id/images?categoryId=<id-opcional>`
- `GET /api/v1/admin/products/:id/images?categoryId=<id-opcional>`
- `PATCH /api/v1/admin/products/:id/images/:imageId?categoryId=<id-opcional>`
- `DELETE /api/v1/admin/products/:id/images/:imageId?categoryId=<id-opcional>`

### Scope variante (galeria)

- `POST /api/v1/admin/variants/:id/images/presign?productId=<id-opcional>&categoryId=<id-opcional>`
- `POST /api/v1/admin/variants/:id/images?productId=<id-opcional>&categoryId=<id-opcional>`
- `GET /api/v1/admin/variants/:id/images?productId=<id-opcional>&categoryId=<id-opcional>`
- `PATCH /api/v1/admin/variants/:id/images/:imageId?productId=<id-opcional>&categoryId=<id-opcional>`
- `DELETE /api/v1/admin/variants/:id/images/:imageId?productId=<id-opcional>&categoryId=<id-opcional>`

Notas:

- Backend valida existencia y pertenencia de entidades cuando se provee contexto padre.
- Registro valida existencia real del objeto en R2 via `HEAD` antes de persistir.

## 4) Descuentos admin

### GET `/api/v1/admin/discounts`

Lista descuentos para gestion.

### POST `/api/v1/admin/discounts`

Crea descuento.

### PATCH `/api/v1/admin/discounts/:id`

Edita descuento existente (mismas validaciones de negocio que create).

### DELETE `/api/v1/admin/discounts/:id`

Elimina descuento.

## 5) Deploy y rollback (orden recomendado)

1. Aplicar migraciones SQL en este orden:
- `category_images`.
- dedupe + unique de `product_images` por `product_id`.
- indices de soporte (`sort_order`, `id`).

2. Desplegar backend con nuevas rutas admin.

3. Desplegar frontend modular `/admin/*`.

4. Smoke test minimo:
- acceso a `/admin` y modulos directos.
- alta + remocion admin.
- CRUD de categoria/producto/variante.
- imagen categoria/producto (reemplazo) y variante (galeria).
- CRUD de descuentos.

### Rollback rapido

- Frontend: volver a build anterior (admin monolitico).
- Backend: deshabilitar consumo de rutas nuevas desde frontend, manteniendo rutas legacy operativas.
- DB: no eliminar tablas nuevas en caliente; si se revierte app, dejar esquema y reintentar despliegue.

### Expectativas de validacion por pertenencia

Si frontend envia `categoryId`/`productId` en deletes o mutaciones de imagenes, backend exige coherencia padre-hijo y rechaza operaciones cruzadas inconsistentes.
