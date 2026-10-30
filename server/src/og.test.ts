import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ogSvg, renderOgPng, truncate, wrap } from './og';

const input = {
  stackName: 'Evening wind down & recovery stack for long days',
  creator: 'Sam <script>',
  productCount: 3,
  score: 72,
  summary: '1 above the upper limit, 1 doubled up',
  composition: [
    { name: 'Zinc', ofLimit: 1.25 },
    { name: 'Magnesium', ofLimit: 0.57 },
    { name: 'Ashwagandha', ofLimit: null },
  ],
  host: 'stack.example',
};

describe('link preview image', () => {
  it('escapes text and wraps long names', () => {
    const svg = ogSvg(input);
    expect(svg).toContain('&amp;');
    expect(svg).toContain('Sam &lt;script&gt;');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('>72<');
    expect(svg).not.toMatch(/[\u2013\u2014]/);
    expect(wrap(input.stackName, 60, 560, 2)).toHaveLength(2);
    expect(truncate('x'.repeat(200), 20, 100).endsWith('\u2026')).toBe(true);
  });

  it('renders a PNG with the bundled fonts', async () => {
    const wasm = readFileSync(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url));
    const fonts = ['Inter_700Bold.ttf', 'Inter_500Medium.ttf'].map((name) => new Uint8Array(readFileSync(new URL(`../assets/${name}`, import.meta.url))));
    const png = await renderOgPng(ogSvg(input), { wasm, fonts });
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(10_000);
  });
});
