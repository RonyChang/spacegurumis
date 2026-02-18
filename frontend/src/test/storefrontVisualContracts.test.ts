import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

const globalCss = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');
const fontsCss = readFileSync(resolve(process.cwd(), 'src/styles/fonts.css'), 'utf8');

function readCssVariable(name: string) {
    const match = globalCss.match(new RegExp(`--${name}:\\s*([^;]+);`));
    return match ? match[1].trim() : '';
}

function parseHexColor(value: string) {
    const normalized = value.replace('#', '').trim();
    if (normalized.length === 3) {
        return normalized.split('').map((item) => Number.parseInt(item + item, 16)) as [number, number, number];
    }
    if (normalized.length === 6) {
        const number = Number.parseInt(normalized, 16);
        return [
            (number >> 16) & 0xff,
            (number >> 8) & 0xff,
            number & 0xff,
        ] as [number, number, number];
    }
    throw new Error(`Unsupported color format: ${value}`);
}

function relativeLuminance([r, g, b]: [number, number, number]) {
    const channels = [r, g, b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string) {
    const fg = relativeLuminance(parseHexColor(foreground));
    const bg = relativeLuminance(parseHexColor(background));
    const [brightest, darkest] = fg >= bg ? [fg, bg] : [bg, fg];
    return (brightest + 0.05) / (darkest + 0.05);
}

describe('storefront visual contracts', () => {
    test('uses self-hosted storefront fonts', () => {
        expect(fontsCss).toContain("@font-face");
        expect(fontsCss).toContain("font-family: 'Noto Sans'");
        expect(fontsCss).toContain("font-family: 'Noto Serif Display'");
        expect(fontsCss).toContain("url('/fonts/NotoSans-Regular.ttf')");
        expect(fontsCss).toContain("url('/fonts/NotoSerifDisplay-Bold.ttf')");

        expect(globalCss).toContain("font-family: 'Noto Sans'");
        expect(globalCss).toContain("font-family: 'Noto Serif Display'");
    });

    test('keeps accessible contrast for primary text and CTA combinations', () => {
        const text = readCssVariable('text');
        const surface = readCssVariable('surface');
        const background = readCssVariable('bg');
        const primary = readCssVariable('primary');
        const primaryInk = readCssVariable('primary-ink');

        expect(contrastRatio(text, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(primaryInk, primary)).toBeGreaterThanOrEqual(3);
    });

    test('defines responsive contracts for product detail purchase controls', () => {
        expect(globalCss).toContain('.qty-control');
        expect(globalCss).toContain('.qty-control__input');
        expect(globalCss).toMatch(/@media \(max-width:\s*820px\)[\s\S]*\.detail-shell__grid\s*{[\s\S]*grid-template-columns:\s*1fr;/);
    });
});
