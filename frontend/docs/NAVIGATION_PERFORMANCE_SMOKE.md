# Smoke de Navegacion Acelerada (Home <-> Product Detail)

## Objetivo

Validar de forma reproducible que el flujo `Home -> Product Detail -> Home` mantiene navegacion usable y mejora de latencia percibida en enlaces elegibles (header + CTA de cards), sin regresiones funcionales.

## Contexto de ejecucion

- App frontend: `spacegurumis/frontend`
- Fecha del registro: actualizar al ejecutar smoke
- Ambiente: local/staging/produccion (indicar cual)
- Viewports obligatorios:
  - Desktop: `1440x900`
  - Mobile: `390x844`

## Flujo base a verificar

1. Abrir `/`.
2. Desde una card de catalogo, usar `Ver detalle` para ir a `/products/<slug>?sku=<sku>`.
3. Volver a Home con enlace elegible del header (por ejemplo `Catálogo`) o navegacion equivalente.
4. Repetir el flujo 2 veces por viewport para confirmar consistencia.

## Comparacion baseline (acelerado vs no acelerado)

### Corrida A: modo acelerado (normal)

1. Mantener JavaScript habilitado.
2. En Home, enfocar/hover sobre un enlace elegible (`Ver detalle` o link de header).
3. Verificar en Network que aparece prefetch antes del click de navegacion.
4. Ejecutar el flujo base completo y registrar percepcion de fluidez.

### Corrida B: baseline no acelerado

1. Deshabilitar JavaScript temporalmente en DevTools (o usar una sesion del navegador con JS desactivado).
2. Repetir el mismo flujo Home -> Product Detail -> Home por navegacion directa.
3. Verificar en Network que no hay prefetch previo al click.
4. Registrar percepcion de fluidez y comportamiento funcional del flujo.

### Criterio de comparacion

- El modo acelerado debe mantenerse funcionalmente correcto y con fluidez percibida igual o mejor que baseline.
- Si baseline se percibe mas fluido o hay regresion funcional en acelerado, marcar `FAIL`.

## Criterios de aprobado/rechazado

### Aprobado

- Todas las rutas del flujo cargan sin errores visibles ni pantallas en blanco.
- El cambio de ruta no presenta recarga pesada perceptible en enlaces elegibles.
- Los enlaces elegibles (`header` y CTA `Ver detalle`) disparan comportamiento de prefetch/transition esperado.
- El flujo conserva comportamiento funcional correcto si no hay aceleracion (fallback a navegacion normal por anchor).

### Rechazado

- Alguna ruta del flujo falla o muestra error bloqueante.
- Hay regresion funcional (link incorrecto, ruta incorrecta, navegacion rota).
- La transicion deja estado colgado o UI inconsistente.
- Se observa degradacion clara de fluidez respecto al comportamiento esperado del change.

## Evidencia a guardar por corrida

- Resultado por viewport: `PASS` / `FAIL`.
- Nota breve de observaciones relevantes.
- Capturas opcionales (inicio Home, detalle, retorno).

Plantilla de registro rapido:

```text
Fecha:
Ambiente:
Desktop (1440x900): PASS|FAIL - notas
Mobile (390x844): PASS|FAIL - notas
Observaciones adicionales:
```
