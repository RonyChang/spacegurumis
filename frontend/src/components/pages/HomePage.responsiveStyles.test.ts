import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const globalCss = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

describe('Storefront responsive style guardrails', () => {
    test('defines stable best-seller hero frame and readable overlay', () => {
        expect(globalCss).toContain('.home-hero__featured');
        expect(globalCss).toContain('.home-hero__featured-overlay');
        expect(globalCss).toMatch(/\.home-hero__featured\s*{[\s\S]*min-height:\s*360px;/);
        expect(globalCss).toMatch(/\.home-hero__featured img\s*{[\s\S]*object-fit:\s*cover;/);
        expect(globalCss).toMatch(/\.home-hero__featured-overlay\s*{[\s\S]*linear-gradient/);
    });

    test('defines mobile navigation collapse and overflow-safe footer stack', () => {
        expect(globalCss).toContain('.nav__toggle');
        expect(globalCss).toContain('.nav__menu');
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.nav__toggle\s*{[\s\S]*display:\s*inline-flex;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.nav__menu\s*{[\s\S]*position:\s*absolute;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.site-footer__inner\s*{[\s\S]*grid-template-columns:\s*1fr;/);
    });
});
