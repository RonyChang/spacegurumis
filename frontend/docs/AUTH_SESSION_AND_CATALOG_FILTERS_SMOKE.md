# Smoke: Auth Recovery + Session Nav + Shop Filters

Fecha recomendada de ejecución: antes de release de `auth-password-recovery-session-ui-and-catalog-filters`.
Estado: ejecutado y cerrado (2026-02-18).

## 1) Recuperación de contraseña

- [x] Desde `/login`, el link `¿Olvidaste tu contraseña?` abre `/forgot-password`.
- [x] En `/forgot-password`, enviar email válido muestra mensaje genérico (sin revelar existencia de cuenta).
- [x] Si hay throttling (`429`), UI muestra feedback sin romper el formulario.
- [x] En correo de recuperación, el enlace apunta a `/reset-password?token=...`.
- [x] En `/reset-password`, token inválido muestra error y bloquea submit.
- [x] En `/reset-password` con token válido, actualizar contraseña redirige a `/login`.

## 2) Navegación pública por estado de sesión

- [x] Como guest, header muestra `Login` y `Crear cuenta`, y no muestra `Perfil`/`Cerrar sesión`.
- [x] Como autenticado, header muestra `Perfil` y `Cerrar sesión`, y no muestra `Login`/`Crear cuenta`.
- [x] Tras `Cerrar sesión` desde header, navegación vuelve a estado guest.
- [x] En rutas públicas (`/`, `/shop`, `/cart`, `/orders`, `/profile`, `/login`, `/register`), no existe enlace visible a `/admin`.

## 3) Filtros globales en `/shop`

- [x] Filtro por categoría consulta backend con `category=<slug>` y reinicia a página 1.
- [x] Filtro por producto consulta backend con `product=<slug>` y respeta categoría activa.
- [x] Filtro de rango precio usa `minPrice`/`maxPrice` y no filtra solo el slice paginado.
- [x] `meta.filters.available` controla categorías, productos y límites de precio.
- [x] Al paginar (`Siguiente`/`Anterior`), mantiene filtros activos en querystring.
- [x] El conteo total (`meta.total`, `meta.totalPages`) se mantiene coherente con filtros activos.

## Evidencia a registrar

- [x] Captura de `/forgot-password` con confirmación genérica.
- [x] Captura de `/reset-password` éxito + redirección a login.
- [x] Captura de header en guest y autenticado.
- [x] Captura/video de `/shop` aplicando categoría + producto + precio + paginación.
