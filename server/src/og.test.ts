import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ogImageVersion, ogSvg, renderOgPng, storyImageVersion, storySvg, truncate, wrap } from './og';

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
  result: null,
};

describe('link preview image', () => {
  it('escapes text and wraps long names', () => {
    const svg = ogSvg(input);
    expect(svg).toContain('&amp;');
    expect(svg).toContain('Sam &lt;script&gt;');
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('>72<');
    expect(svg).not.toContain('1 person');
    expect(svg).not.toMatch(/[\u2013\u2014]/);
    const story = storySvg(input);
    expect(story).toContain('width="1080"');
    expect(story).toContain('height="1920"');
    expect(story).toContain('Sam &lt;script&gt;');
    expect(story).not.toMatch(/[\u2013\u2014]/);
    expect(ogImageVersion(1)).toBe(3_000_001);
    expect(storyImageVersion(1)).toBe(3_500_001);
    const counted = ogSvg({ ...input, copyLabel: 'Copied by 24 people' });
    expect(counted).toContain('Copied by 24 people');
    expect(counted).not.toContain('Kept by');
    expect(storySvg({ ...input, copyLabel: 'Copied by 24 people' })).toContain('Copied by 24 people');
    expect(wrap(input.stackName, 60, 560, 2)).toHaveLength(2);
    expect(truncate('x'.repeat(200), 20, 100).endsWith('\u2026')).toBe(true);
  });

  it('puts the published headline on both images and leaves copier numbers off', () => {
    const withResult = {
      ...input,
      result: {
        value: '6%',
        word: 'lower',
        label: 'Resting heart rate',
        device: 'Apple Watch <b>',
        disclaimer: '1 person, not a trial',
        kicker: 'What changed for Sam',
      },
    };
    const card = ogSvg(withResult);
    const story = storySvg(withResult);
    for (const svg of [card, story]) {
      expect(svg).toContain('6%');
      expect(svg).toContain('not a trial');
      expect(svg).toContain('12 weeks');
      expect(svg).toContain('&lt;b&gt;');
      expect(svg).not.toContain('<b>');
      expect(svg).not.toContain('Kept by');
      expect(svg).not.toContain('Copied by');
      expect(svg).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('renders a PNG with the bundled fonts', async () => {
    const wasm = readFileSync(new URL('../node_modules/@resvg/resvg-wasm/index_bg.wasm', import.meta.url));
    const fonts = ['Nunito_700Bold.ttf', 'Nunito_500Medium.ttf'].map((name) => new Uint8Array(readFileSync(new URL(`../assets/${name}`, import.meta.url))));
    const assets = { wasm, fonts };
    const png = await renderOgPng(ogSvg(input), assets);
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(10_000);
    const story = await renderOgPng(storySvg(input), assets, 1080);
    expect([...story.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(story.length).toBeGreaterThan(10_000);
  });
});
