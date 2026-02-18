import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const globalCss = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

describe('Product detail gallery square-image styles', () => {
    test('defines 1:1 gallery main container with non-deforming fit', () => {
        expect(globalCss).toContain('.gallery__main');
        expect(globalCss).toMatch(/\.gallery__main\s*{[\s\S]*aspect-ratio:\s*1\s*\/\s*1;/);
        expect(globalCss).toMatch(/\.gallery__main\s*{[\s\S]*background:\s*var\(--surface-2\);/);
        expect(globalCss).toMatch(/\.gallery__main img\s*{[\s\S]*object-fit:\s*contain;/);
    });

    test('defines 1:1 thumbnail boxes with stable active state styles', () => {
        expect(globalCss).toContain('.gallery__thumb');
        expect(globalCss).toMatch(/\.gallery__thumb\s*{[\s\S]*aspect-ratio:\s*1\s*\/\s*1;/);
        expect(globalCss).toMatch(/\.gallery__thumb img\s*{[\s\S]*object-fit:\s*contain;/);
        expect(globalCss).toMatch(/\.gallery__thumb--active\s*{[\s\S]*box-shadow:/);
    });

    test('keeps detail composition responsive to avoid horizontal overflow on mobile', () => {
        expect(globalCss).toMatch(/\.detail-shell__grid\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1\.15fr\)\s*minmax\(0,\s*1fr\);/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.detail-shell__grid\s*{[\s\S]*grid-template-columns:\s*1fr;/);
    });
});
