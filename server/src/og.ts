/**
 * Link preview image for a shared stack, 1200 by 630.
 * Built as SVG and rasterised with resvg. Inter is bundled under the SIL Open Font License (assets/Inter-OFL.txt).
 * No personal result or copier numbers appear on the image.
 */

export type OgInput = {
  stackName: string;
  creator: string;
  productCount: number;
  score: number;
  summary: string;
  composition: { name: string; ofLimit: number | null }[];
  host: string;
};

const TEAL = '#0E7C6B';
const TEAL_DEEP = '#0A5C50';
const SLATE = '#344054';
const SLATE_DEEP = '#1D2939';
const INK = '#16181D';
const MUTED = '#667085';
const TRACK = '#EEF1F4';
const OVER = '#B42318';

export function scoreTone(score: number): 'good' | 'neutral' {
  return score >= 80 ? 'good' : 'neutral';
}

export function ogSvg(input: OgInput): string {
  const tone = scoreTone(input.score);
  const panelFrom = tone === 'good' ? TEAL : SLATE;
  const panelTo = tone === 'good' ? TEAL_DEEP : SLATE_DEEP;
  const title = wrap(input.stackName, 60, 610, 2);
  const titleY = title.length === 1 ? 236 : 206;
  const titleText = title
    .map((line, index) => `<text x="72" y="${titleY + index * 70}" font-family="Inter" font-weight="700" font-size="60" fill="${INK}" letter-spacing="-1.5">${escapeXml(line)}</text>`)
    .join('');
  const byline = `${input.creator}, ${input.productCount} ${input.productCount === 1 ? 'product' : 'products'}`;
  const bylineY = titleY + (title.length - 1) * 70 + 52;
  const rows = input.composition.slice(0, 4);
  const rowStart = Math.max(bylineY + 56, 360);
  const composition = rows
    .map((row, index) => {
      const y = rowStart + index * 46;
      const name = truncate(row.name, 22, 230);
      const ratio = row.ofLimit == null ? null : Math.max(0, row.ofLimit);
      const fill = ratio == null ? 0 : Math.min(1, ratio) * 300;
      const colour = ratio != null && ratio > 1 ? OVER : TEAL;
      const bar =
        ratio == null
          ? `<text x="330" y="${y + 7}" font-family="Inter" font-weight="500" font-size="20" fill="${MUTED}">No upper limit</text>`
          : `<rect x="330" y="${y - 8}" width="300" height="16" rx="8" fill="${TRACK}"/><rect x="330" y="${y - 8}" width="${Math.max(16, fill).toFixed(0)}" height="16" rx="8" fill="${colour}"/>`;
      return `<text x="72" y="${y + 8}" font-family="Inter" font-weight="500" font-size="22" fill="${INK}">${escapeXml(name)}</text>${bar}`;
    })
    .join('');
  const circumference = 2 * Math.PI * 128;
  const dash = (Math.max(0, Math.min(100, input.score)) / 100) * circumference;
  const summary = wrap(input.summary, 22, 380, 2)
    .map((line, index) => `<text x="940" y="${505 + index * 30}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="22" fill="#FFFFFF" fill-opacity="0.82">${escapeXml(line)}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${panelFrom}"/>
    <stop offset="1" stop-color="${panelTo}"/>
  </linearGradient>
</defs>
<rect width="1200" height="630" fill="#FFFFFF"/>
<rect x="0" y="0" width="1200" height="10" fill="${TEAL}"/>
<g transform="translate(72 64)">
  <rect width="44" height="44" rx="12" fill="${TEAL}"/>
  <rect x="10" y="11" width="24" height="6" rx="3" fill="#FFFFFF"/>
  <rect x="10" y="20" width="24" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.8"/>
  <rect x="10" y="29" width="24" height="6" rx="3" fill="#FFFFFF" fill-opacity="0.6"/>
  <text x="58" y="32" font-family="Inter" font-weight="700" font-size="30" fill="${INK}" letter-spacing="-0.5">Stack</text>
</g>
${titleText}
<text x="72" y="${bylineY}" font-family="Inter" font-weight="500" font-size="28" fill="${MUTED}">${escapeXml(truncate(byline, 28, 610))}</text>
${composition}
<text x="72" y="584" font-family="Inter" font-weight="700" font-size="24" fill="${TEAL}">Check your stack against this one</text>
<rect x="720" y="40" width="440" height="550" rx="40" fill="url(#panel)"/>
<circle cx="940" cy="262" r="128" fill="none" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="26"/>
<circle cx="940" cy="262" r="128" fill="none" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 940 262)"/>
<text x="940" y="296" text-anchor="middle" font-family="Inter" font-weight="700" font-size="104" fill="#FFFFFF" letter-spacing="-4">${input.score}</text>
<text x="940" y="336" text-anchor="middle" font-family="Inter" font-weight="500" font-size="22" fill="#FFFFFF" fill-opacity="0.75">out of 100</text>
<text x="940" y="460" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#FFFFFF">Dose audit</text>
${summary}
</svg>`;
}

/** Greedy word wrap by estimated width. The last line is truncated when the text does not fit. */
export function wrap(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? '';
    const next = current ? `${current} ${word}` : word;
    if (estimateWidth(next, fontSize) <= maxWidth || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) {
      current = words.slice(index).join(' ');
      break;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines).map((line, index, all) => (index === all.length - 1 ? truncate(line, fontSize, maxWidth) : line));
}

export function truncate(text: string, fontSize: number, maxWidth: number): string {
  if (estimateWidth(text, fontSize) <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && estimateWidth(`${cut}\u2026`, fontSize) > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}\u2026`;
}

function estimateWidth(text: string, fontSize: number): number {
  let units = 0;
  for (const char of text) {
    if ('il.,:;\'|!'.includes(char)) units += 0.3;
    else if ('mwMW'.includes(char)) units += 0.85;
    else if (char === ' ') units += 0.28;
    else if (char >= 'A' && char <= 'Z') units += 0.68;
    else units += 0.56;
  }
  return units * fontSize;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export type OgAssets = { wasm: WebAssembly.Module | BufferSource; fonts: Uint8Array[] };

let ready: Promise<void> | null = null;

export async function renderOgPng(svg: string, assets: OgAssets): Promise<Uint8Array> {
  const { initWasm, Resvg } = await import('@resvg/resvg-wasm');
  if (!ready) {
    ready = initWasm(assets.wasm).catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  await ready;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    font: { fontBuffers: assets.fonts, defaultFontFamily: 'Inter', sansSerifFamily: 'Inter' },
  });
  const png = resvg.render().asPng();
  resvg.free();
  return png;
}
