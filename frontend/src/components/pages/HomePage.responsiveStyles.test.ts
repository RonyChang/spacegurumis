import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const globalCss = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

describe('Home hero special-order CTA responsive styles', () => {
    test('defines desktop-readable typography and spacing for hero promo CTA', () => {
        expect(globalCss).toContain('.promo-cta__overlay h3');
        expect(globalCss).toContain('.home-hero__promo');
        expect(globalCss).toMatch(/\.promo-cta__overlay h3\s*{[\s\S]*font-size:\s*clamp\(24px,\s*2\.4vw,\s*37px\);/);
        expect(globalCss).toMatch(/\.promo-cta__overlay h3\s*{[\s\S]*line-height:\s*1\.2;/);
        expect(globalCss).toMatch(/\.promo-cta__overlay h3\s*{[\s\S]*max-width:\s*18ch;/);
        expect(globalCss).toMatch(/\.home-hero__promo\s*{[\s\S]*min-height:\s*360px;/);
    });

    test('defines mobile overrides to preserve readability and avoid cramped layout', () => {
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.home-hero__promo\s*{[\s\S]*min-height:\s*230px;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.home-hero__promo img\s*{[\s\S]*min-height:\s*230px;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.promo-cta__overlay\s*{[\s\S]*padding:\s*14px;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.promo-cta__overlay h3\s*{[\s\S]*font-size:\s*24px;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.promo-cta__overlay h3\s*{[\s\S]*max-width:\s*22ch;/);
    });
});
