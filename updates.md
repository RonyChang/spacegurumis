# Updates

## Versión: v0.1.0

### Cambios
- Estructura base de repo con carpetas `backend/` y `frontend/`.
- Backend Express con endpoint `GET /health` y middlewares base.
- Config básica y `.env.example` para variables locales.
- Frontend estático con React vía CDN y layout mínimo.
- Dockerfile y `.dockerignore` para backend y frontend.
- README con instrucciones de ejecución local.

### Notas
- Esta versión valida el arranque del proyecto y el health check.

## Versión: v0.1.1

### Cambios
- Agregado `docker-compose.yml` para Postgres con volumen persistente.
- Nueva guía `backend/docs/setup-postgresql.md`.
- Variables de entorno PG* en `.env.example`.
- README actualizado con pasos básicos de DB.
- Puerto host de Postgres configurado en 5433.

## Versión: v0.1.2

### Cambios
- `.env.example` completado con variables base del proyecto.
- Nuevas guías: Google OAuth, SMTP, WhatsApp y Stripe en `backend/docs/`.
- README actualizado con enlaces a guías de configuración.

## Versión: v0.2.0

### Cambios
- Esquema SQL base del catálogo en `backend/db/schema.sql`.
- Documentación del esquema en `backend/docs/schema.md`.
- Endpoints read-only de catálogo para categorías y productos.
- Detalle de producto con variantes e inventario disponible.
- Conexión a Postgres vía `pg` y pool centralizado en config.

## Versión: v0.2.1

### Cambios
- Filtros por categoría, texto y precio en listado de productos.
- Paginación con `page` y `pageSize`, y metadata en la respuesta.

## Versión: v0.2.2

### Cambios
- Precios almacenados en centimos en `product_variants.price_cents`.
- La API convierte y responde precios en soles.

## Versión: v0.2.3

### Cambios
- Nuevo listado y detalle por variante en `/api/v1/catalog/variants` y `/api/v1/catalog/variants/:sku`.
- Filtros y paginación aplican al listado de variantes.
- Listado de tipos en `/api/v1/catalog/products` ahora incluye `variantsCount`.
- CORS restringido a dominios HTTPS y entornos locales.

## Versión: v0.3.0

### Cambios
- Registro y login con JWT en `/api/v1/auth/register` y `/api/v1/auth/login`.
- Nueva tabla `users` con password hasheada y rol por defecto `customer`.
- Validaciones mínimas para email y contraseña.

## Versión: v0.3.1

### Cambios
- Perfil autenticado en `/api/v1/profile` (GET y PUT).
- Nueva tabla `user_addresses` con dirección 1:1 por usuario.
- Validaciones mínimas para teléfono y campos de dirección.

## Versión: v0.3.2

### Cambios
- Login con Google OAuth en `/api/v1/auth/google` y callback `/api/v1/auth/google/callback`.
- Vinculación de cuentas por email existente.
- `users` ahora guarda `google_id` y `avatar_url` y permite `password_hash` NULL.
- Frontend con navegación (login/registro/perfil), cierre de sesión y formulario de perfil.
- Botón de acceso Google en el frontend (redirige al login con token).
- Registro ahora permite solo email y contraseña; el nombre se completa en el perfil.
- Callback de Google redirige al frontend cuando `FRONTEND_BASE_URL` está configurado.

## Version: v0.4.0

### Cambios
- Carrito persistente en BD con tablas `carts` y `cart_items`.
- Endpoints CRUD de carrito en `/api/v1/cart` y `/api/v1/cart/items`.
- Frontend agrega pagina `/cart` y boton de carrito en el header.
- Acciones basicas: agregar, actualizar cantidad, eliminar y vaciar carrito.

## Version: v0.4.1

### Cambios
- Carrito ahora devuelve `summary` con subtotal y total de items.
- Validacion de stock al agregar o actualizar cantidades (409 si supera stock).

## Version: v0.4.2

### Cambios
- Carrito local para invitados usando `localStorage`.
- `/cart` muestra el carrito local si no hay sesion.
- Sincronizacion del carrito local al iniciar sesion o registrarse.
- Si falla la sincronizacion, se conservan items locales y se muestra el error.

## Version: v0.5.0

### Cambios
- Orden `pendingPayment` creada desde el carrito en `POST /api/v1/orders`.
- Nuevas tablas `orders` y `order_items` con snapshot del carrito.
- El carrito se limpia al crear la orden.

## Version: v0.5.1

### Cambios
- Calculo de envio segun distrito del perfil.
- `orders` ahora guarda `shipping_cost_cents`.
- Total de orden incluye subtotal + envio.
- Se requiere direccion completa para crear la orden.

## Version: v0.5.2

### Cambios
- Reserva de stock al crear la orden y liberación al cancelar.
- Cancelación de orden `pendingPayment` en `POST /api/v1/orders/:id/cancel`.
- Soporte de códigos de descuento (validación y aplicación).
- Nuevas tablas `discount_codes` y `discount_redemptions`.
- Orden guarda `discount_code`, `discount_percentage` y `discount_amount_cents`.

## Versión: v0.6.0

### Cambios
- Endpoint `POST /api/v1/payments/stripe/session` para crear sesión de Stripe Checkout.
- El total enviado a Stripe usa subtotal, descuento y envío de la orden.
- Frontend agrega botón para pagar con Stripe desde el carrito.
- Nuevas variables `STRIPE_SUCCESS_URL` y `STRIPE_CANCEL_URL`.
- Postman y guía de Stripe actualizados.

## Versión: v0.6.1

### Cambios
- Webhook `POST /api/v1/webhooks/stripe` con validación de firma.
- Actualiza estados de orden/pago en eventos `checkout.session.completed` y `checkout.session.expired`.
- Job interno que expira órdenes `pendingPayment` y libera stock reservado.
- Expiración configurable con `PAYMENT_HOLD_MINUTES` (por defecto 3 minutos).

## Version: v0.6.2

### Cambios
- Orden guarda stripe_session_id y stripe_payment_intent_id.
- Creacion de sesion Stripe idempotente y reutiliza sesion existente.
- Webhook persiste payment_intent en la orden.

## Version: v0.7.0

### Cambios
- Bootstrap de admins con ADMIN_EMAILS al iniciar el backend.
- Crea admins faltantes con ADMIN_BOOTSTRAP_PASSWORD.
- Usuarios admin usan el mismo login y rol admin.

## Version: v0.7.1

### Cambios
- Registro ahora envia codigo de verificacion por email.
- Login bloqueado hasta verificar el correo.
- Nuevo endpoint `POST /api/v1/auth/verify-email`.
- Nueva tabla `email_verifications` y columna `email_verified_at` en `users`.

## Version: v0.7.2

### Cambios
- Login admin requiere codigo 2FA por email.
- Nuevo endpoint `POST /api/v1/auth/admin/verify-2fa`.
- Nueva tabla `admin_2fa_challenges` para desafios 2FA.

## Version: v0.7.3

### Cambios
- Reenvio de codigo de verificacion via `POST /api/v1/auth/resend-verification`.
- Boton de reenvio en la pantalla de verificacion.

## Version: v0.7.4

### Cambios
- Cooldown de 60 segundos para reenviar el codigo de verificacion.

## Version: v0.7.5

### Cambios
- Endpoints admin para listar ordenes con filtros y paginacion.
- Endpoint admin para actualizar estado de orden.
- Endpoint admin para actualizar stock de variantes.
- Middleware `adminRequired` para validar rol admin.

## Version: v0.8.0

### Cambios
- Email de confirmacion de pago via Resend.
- Nueva columna `orders.payment_email_sent_at` para idempotencia.
- Nuevo doc `backend/docs/setup-resend.md` y variables RESEND en .env.example.
- Verificacion de email y 2FA admin ahora se envian con Resend.

## Version: v0.8.1

### Cambios
- Emails de estado `shipped` y `delivered` via Resend.
- Columnas `shipped_email_sent_at` y `delivered_email_sent_at` en orders.
- Boton de WhatsApp para consultar por producto.
- Boton de WhatsApp para consultar por orden creada.
- Numero y mensaje configurables desde `frontend/index.html`.

## Version: v0.8.2

### Cambios
- Listado de pedidos del usuario en `GET /api/v1/orders` con paginacion.
- Detalle de pedido propio en `GET /api/v1/orders/:id` con items y totales.
- Frontend agrega vista "Mis pedidos" con detalle y estados.

## Version: v1.0.0

### Cambios
- Catalogo completo por variantes con filtros, paginacion y detalle.
- Carrito persistente en BD con sincronizacion local para invitados.
- Ordenes con reserva de stock, cancelacion y expiracion automatica.
- Descuentos aplicados en orden (validacion en checkout).
- Pagos con Stripe Checkout + webhook para estados de pago.
- Emails transaccionales via Resend (pago aprobado, shipped, delivered).
- Autenticacion JWT + Google OAuth (vinculacion por email).
- Verificacion de email en registro y 2FA por email para admins.
- Admin bootstrap y endpoints admin (ordenes, stock de variantes).
- Frontend con login/registro, perfil, carrito y pedidos.
- Botones de WhatsApp para consulta de producto y de orden.
