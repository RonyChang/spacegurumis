import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DIST_SERVER_DIR = resolve(FRONTEND_ROOT, 'dist/server');

const REQUIRED_DIST_FILES = ['entry.mjs', 'renderers.mjs', 'noop-entrypoint.mjs', '_noop-middleware.mjs'];

function hasReusableSsrArtifacts() {
    if (!existsSync(DIST_SERVER_DIR)) {
        return false;
    }

    if (REQUIRED_DIST_FILES.some((file) => !existsSync(resolve(DIST_SERVER_DIR, file)))) {
        return false;
    }

    return readdirSync(DIST_SERVER_DIR).some(
        (entry) => entry.startsWith('manifest_') && entry.endsWith('.mjs')
    );
}

function buildSsrArtifacts() {
    const result = spawnSync('npm', ['run', 'build'], {
        cwd: FRONTEND_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
    });

    if (result.status === 0) {
        return;
    }

    const details = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`Astro build failed in Vitest global setup.\n${details}`);
}

export default async function globalSetup() {
    if (process.env.VITEST_SKIP_SSR_BUILD === '1') {
        return;
    }

    if (process.env.VITEST_FORCE_SSR_BUILD === '1' || !hasReusableSsrArtifacts()) {
        buildSsrArtifacts();
    }
}
