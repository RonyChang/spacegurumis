# Smoke Storefront: Session + Mobile + Footer + Special Orders

## Objetivo

Validar el rediseño de storefront enfocado en:
- bootstrap de sesion sin flicker visible
- navegacion movil sin overflow
- footer publico completo
- rutas de ayuda (`/about`, `/contact`, `/care-instructions`, `/special-orders`)
- hero de Home basado en best-seller con fallback estable
- ausencia de discoverability de `/admin` en superficies publicas

## Ambito y viewports

- Desktop: `1440x900`
- Mobile: `390x844`
- Rutas cubiertas:
  - `/`
  - `/shop`
  - `/about`
  - `/contact`
  - `/care-instructions`
  - `/special-orders`
  - `/admin`
  - `/admin/catalogo`

## Checklist

### 1) Header/Footer movil y desktop

- [x] En mobile el menu se abre/cierra con boton (aria-expanded cambia correctamente).
- [x] En mobile el menu cierra con `Escape` y al tocar un link.
- [x] En mobile no hay overflow horizontal del header.
- [x] En mobile footer apila columnas en orden legible.
- [x] En desktop header y footer renderizan layout completo sin colisiones.

### 2) Sesion sin flicker

- [x] Usuario autenticado: no se muestra `Login/Crear cuenta` antes de `Perfil/Cerrar sesion`.
- [x] Usuario guest: se muestran acciones guest sin salto a estado autenticado.
- [x] Estado inicial `unknown`: muestra estado neutro y luego converge.

### 3) Hero Home best-seller y fallback

- [x] Highlight presente: hero usa imagen + nombre de variante destacada.
- [x] Highlight ausente: hero usa primera variante valida del payload.
- [x] Highlight y variantes ausentes: hero usa placeholder local sin colapsar layout.
- [x] Falla de slot decorativo `home-hero` no bloquea hero comercial.

### 4) Rutas de ayuda y CTA special orders

- [x] `/about` responde con contenido legible y heading principal.
- [x] `/contact` muestra correo y telefono/WhatsApp.
- [x] `/care-instructions` muestra guia de cuidado escaneable.
- [x] `/special-orders` muestra pasos claros + CTA WhatsApp.
- [x] CTA `Pedidos especiales` de Home navega a `/special-orders` (no abre WhatsApp directo).
- [x] Si WhatsApp no esta configurado, `/special-orders` muestra fallback sin crash.

### 5) Frontera publica/admin

- [x] Header/footer/home/help pages no renderizan links `href="/admin"` ni `href="/admin/*"`.
- [x] Usuario no autenticado en `/admin` o `/admin/*` no obtiene contenido admin usable.
- [x] Usuario autenticado no-admin en `/admin` o `/admin/*` es redirigido a ruta segura.

## Evidencia ejecutada

```text
Fecha: 2026-02-18
Ambiente: local test runtime (SSR) + suites automatizadas frontend/backend
Tester: Codex + evidencia automatizada en CI local

Resultado global: PASS

Notas:
- Frontend tests: PASS (16 files, 96 tests)
- Backend tests: PASS (21 files)
- Core routes runtime: PASS para rutas nuevas y existentes
- No se detectaron regresiones en flujos criticos de navegacion publica

Follow-ups:
- Mantener este smoke en cada cambio que toque header/footer/session/Home hero.
```
