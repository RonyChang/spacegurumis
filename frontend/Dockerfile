# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

FROM node:20-alpine AS build
WORKDIR /app

ARG PUBLIC_API_BASE_URL
ARG PUBLIC_WHATSAPP_NUMBER
ARG PUBLIC_WHATSAPP_TEMPLATE
ARG PUBLIC_WHATSAPP_ORDER_TEMPLATE
ARG PUBLIC_IMAGE_TRANSFORM_BASE_URL
ARG PUBLIC_IMAGE_SOURCE_HOST

ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}
ENV PUBLIC_WHATSAPP_NUMBER=${PUBLIC_WHATSAPP_NUMBER}
ENV PUBLIC_WHATSAPP_TEMPLATE=${PUBLIC_WHATSAPP_TEMPLATE}
ENV PUBLIC_WHATSAPP_ORDER_TEMPLATE=${PUBLIC_WHATSAPP_ORDER_TEMPLATE}
ENV PUBLIC_IMAGE_TRANSFORM_BASE_URL=${PUBLIC_IMAGE_TRANSFORM_BASE_URL}
ENV PUBLIC_IMAGE_SOURCE_HOST=${PUBLIC_IMAGE_SOURCE_HOST}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
