// @vitest-environment node

import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, test } from 'vitest';
import { NodeApp } from 'astro/app/node';

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST_SERVER_DIR = resolve(FRONTEND_ROOT, 'dist/server');

type CoreRouteCase = {
    route: string;
    titleNeedle: string;
    contentNeedle: string;
};

const CORE_ROUTE_CASES: CoreRouteCase[] = [
    { route: '/', titleNeedle: 'Spacegurumis | Inicio', contentNeedle: 'Adorables' },
    { route: '/shop', titleNeedle: 'Spacegurumis | Tienda', contentNeedle: 'Adopta un Alien' },
    { route: '/products/smoke-slug', titleNeedle: 'Spacegurumis | smoke-slug', contentNeedle: 'Detalle' },
    { route: '/login', titleNeedle: 'Spacegurumis | Login', contentNeedle: 'Iniciar sesión' },
    { route: '/register', titleNeedle: 'Spacegurumis | Registro', contentNeedle: 'Crear cuenta' },
    { route: '/verify', titleNeedle: 'Spacegurumis | Verificar email', contentNeedle: 'Verificar email' },
    { route: '/admin-2fa', titleNeedle: 'Spacegurumis | Verificación admin', contentNeedle: 'Verificación admin' },
    { route: '/profile', titleNeedle: 'Spacegurumis | Perfil', contentNeedle: 'Perfil' },
    { route: '/cart', titleNeedle: 'Spacegurumis | Carrito', contentNeedle: 'Carrito' },
    { route: '/orders', titleNeedle: 'Spacegurumis | Mis pedidos', contentNeedle: 'Mis pedidos' },
    { route: '/admin', titleNeedle: 'Spacegurumis | Admin', contentNeedle: 'Admin' },
];

async function importFresh<T = Record<string, unknown>>(filePath: string): Promise<T> {
    const url = `${pathToFileURL(filePath).href}?v=${Date.now()}-${Math.random()}`;
    return (await import(url)) as T;
}

async function loadRuntimeApp() {
    process.env.ASTRO_NODE_AUTOSTART = 'disabled';

    if (!existsSync(DIST_SERVER_DIR)) {
        throw new Error(
            'Missing dist/server artifacts for runtime reachability test. Run `npm run build` first or use Vitest global setup.'
        );
    }

    const manifestFile = readdirSync(DIST_SERVER_DIR).find(
        (entry) => entry.startsWith('manifest_') && entry.endsWith('.mjs')
    );
    if (!manifestFile) {
        throw new Error('No SSR manifest file found under dist/server.');
    }

    const manifestModule = await importFresh<{ manifest: Record<string, unknown> }>(
        resolve(DIST_SERVER_DIR, manifestFile)
    );
    const rendererModule = await importFresh<{ renderers: unknown[] }>(
        resolve(DIST_SERVER_DIR, 'renderers.mjs')
    );
    const entryModule = await importFresh<{ pageMap: Map<string, () => Promise<unknown>> }>(
        resolve(DIST_SERVER_DIR, 'entry.mjs')
    );

    const runtimeManifest = Object.assign(manifestModule.manifest, {
        pageMap: entryModule.pageMap,
        serverIslandMap: new Map(),
        renderers: rendererModule.renderers,
        actions: () => importFresh(resolve(DIST_SERVER_DIR, 'noop-entrypoint.mjs')),
        middleware: () => importFresh(resolve(DIST_SERVER_DIR, '_noop-middleware.mjs')),
    });

    return new NodeApp(runtimeManifest);
}

let app: NodeApp;

describe('core SSR routes reachability runtime', () => {
    beforeAll(async () => {
        app = await loadRuntimeApp();
    }, 120_000);

    for (const routeCase of CORE_ROUTE_CASES) {
        test(`responds 200 and usable HTML for ${routeCase.route}`, async () => {
            const response = await app.render(
                new Request(new URL(routeCase.route, 'http://localhost').toString())
            );
            const html = await response.text();

            expect(response.status).toBe(200);
            expect(html).toContain('<main id="main"');
            expect(html).toContain(routeCase.titleNeedle);
            expect(html).toContain(routeCase.contentNeedle);

            if (routeCase.route === '/') {
                expect(html).not.toContain('href="/admin"');
            }

            if (routeCase.route === '/shop') {
                expect(html).not.toContain('href="/admin"');
            }

            if (routeCase.route === '/admin') {
                expect(html).toContain('Ver tienda');
            }
        });
    }
});
