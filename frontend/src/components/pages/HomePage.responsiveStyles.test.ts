import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const globalCss = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

describe('Home promotional banner responsive styles', () => {
    test('defines desktop-readable typography and spacing for promo CTA', () => {
        expect(globalCss).toContain('.promo-cta__overlay h3');
        expect(globalCss).toMatch(/\.promo-cta__overlay h3\s*{[\s\S]*font-size:\s*clamp\(20px,\s*2vw,\s*28px\);/);
        expect(globalCss).toMatch(/\.promo-cta__overlay h3\s*{[\s\S]*line-height:\s*1\.2;/);
        expect(globalCss).toMatch(/\.promo-cta__overlay h3\s*{[\s\S]*max-width:\s*38ch;/);
    });

    test('defines mobile overrides to preserve readability and avoid cramped layout', () => {
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.promo-cta\s*{[\s\S]*min-height:\s*230px;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.promo-cta img\s*{[\s\S]*min-height:\s*230px;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.promo-cta__overlay\s*{[\s\S]*padding:\s*14px;/);
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.promo-cta__overlay h3\s*{[\s\S]*font-size:\s*21px;/);
    });
});
