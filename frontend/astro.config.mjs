import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';

export default defineConfig({
    output: 'server',
    adapter: node({ mode: 'standalone' }),
    integrations: [react()],
    server: {
        host: true,
        port: 4321,
    },
    vite: {
        // Local dev convenience: keep `PUBLIC_API_BASE_URL` empty (same-origin),
        // and proxy `/api/*` to the backend to avoid CORS.
        server: {
            proxy: {
                '/api': {
                    target: process.env.API_INTERNAL_BASE_URL || 'http://localhost:3000',
                    changeOrigin: true,
                },
            },
        },
    },
});
