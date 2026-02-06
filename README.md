# Spacegurumis

Backend y frontend de la tienda Spacegurumis. Este README describe el proyecto en general.
El detalle por versión está en `updates.md`.

## Estructura
- `backend/`: API REST (Node.js + Express).
- `frontend/`: UI estática.

## Requisitos
- Node.js 18+
- npm
- Docker Desktop (para base de datos)

## Instalación rápida
Backend:
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm start
```

Abrir en el navegador:
```
http://localhost:5173
```

## Docs
- Guias de configuracion en `backend/docs/` (incluye `setup-resend.md`).

## Endpoints principales
Salud:
- `GET /health`

Catálogo (variantes):
- `GET /api/v1/catalog/variants`
- `GET /api/v1/catalog/variants/:sku`

Catálogo (tipos):
- `GET /api/v1/catalog/products`
- `GET /api/v1/catalog/products/:slug`

Auth:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/google`
- `GET /api/v1/auth/google/callback`

Perfil:
- `GET /api/v1/profile`
- `PUT /api/v1/profile`
