# Cloudflare Image Worker Contract

## Objetivo

Definir el contrato operativo del Worker de imagenes para que el storefront reciba siempre transforms `1:1`
sin deformacion y con relleno negro consistente.

## Ruta y DNS requeridos

- Worker route: `img.spacegurumis.lat/*`
- DNS record: `img` en modo proxied (nube naranja)
- `SOURCE_HOST` en Worker: `assets.spacegurumis.lat`

## Presets obligatorios

- `thumb`: thumbnails de Product Detail
- `card`: cards/listados cuando una vista use worker
- `detail`: imagen principal de Product Detail

Todos con:
- `fit: "contain"`
- `background: "rgb(0,0,0)"`

## Hardening obligatorio

- Rechazar preset fuera de `thumb|card|detail`.
- Rechazar keys vacias, con `..` o sin prefijo permitido.
- Prefijos permitidos:
  - `variants/`
  - `products/`
  - `categories/`
  - `site/`

## Script de referencia del Worker

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    const preset = parts.shift();
    const key = parts.join("/");

    const presets = {
      thumb: { width: 240, height: 240, fit: "contain", background: "rgb(0,0,0)", quality: 80, format: "auto" },
      card: { width: 640, height: 640, fit: "contain", background: "rgb(0,0,0)", quality: 82, format: "auto" },
      detail: { width: 1080, height: 1080, fit: "contain", background: "rgb(0,0,0)", quality: 85, format: "auto" },
    };

    const allowedPrefixes = ["variants/", "products/", "categories/", "site/"];
    if (
      !presets[preset] ||
      !key ||
      key.includes("..") ||
      !allowedPrefixes.some((prefix) => key.startsWith(prefix))
    ) {
      return new Response("Not found", { status: 404 });
    }

    const source = `https://${env.SOURCE_HOST}/${key}`;
    return fetch(source, {
      cf: {
        image: presets[preset],
        cacheEverything: true,
      },
    });
  },
};
```

## Checklist de rollout seguro

1. Deploy del Worker con el script de referencia (o equivalente estricto).
2. Confirmar `SOURCE_HOST` correcto.
3. Confirmar route `img.spacegurumis.lat/*`.
4. Confirmar DNS proxied para `img`.
5. Validar en browser:
   - `https://img.spacegurumis.lat/detail/variants/<key-real>`
   - `https://img.spacegurumis.lat/thumb/variants/<key-real>`
   - `https://img.spacegurumis.lat/card/variants/<key-real>`
6. Ejecutar smoke: `frontend/docs/PRODUCT_DETAIL_IMAGE_DELIVERY_SMOKE.md`.
