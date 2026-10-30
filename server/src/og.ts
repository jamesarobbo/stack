/**
 * Link preview (1200 by 630) and story image (1080 by 1920) for a shared stack.
 * Built as SVG and rasterised with resvg. Inter is bundled under the SIL Open Font License (assets/Inter-OFL.txt).
 * Copier averages never appear. The owner's published headline can, with its window and device.
 */

export const OG_CACHE_VERSION = 2;
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/** Cache key for the link preview. A renderer bump misses every previously stored PNG. */
export function ogImageVersion(shareVersion: number): number {
  return OG_CACHE_VERSION * 1_000_000 + shareVersion;
}

/** Cache key for the story image. Kept apart from the link preview key. */
export function storyImageVersion(shareVersion: number): number {
  return OG_CACHE_VERSION * 1_000_000 + 500_000 + shareVersion;
}

export type OgResult = {
  value: string;
  word: string;
  label: string;
  device: string;
  disclaimer: string;
  kicker: string;
};

export type OgInput = {
  stackName: string;
  creator: string;
  productCount: number;
  score: number;
  summary: string;
  composition: { name: string; ofLimit: number | null }[];
  host: string;
  result: OgResult | null;
};

const TEAL = '#0E7C6B';
const TEAL_DEEP = '#0A5C50';
const TEAL_SOFT = '#E5F5F1';
const SLATE = '#344054';
const SLATE_DEEP = '#1D2939';
const INK = '#16181D';
const MUTED = '#667085';
const TRACK = '#EEF1F4';
const OVER = '#B42318';
const NEAR = '#DC9B04';

export function scoreTone(score: number): 'good' | 'neutral' {
  return score >= 80 ? 'good' : 'neutral';
}

export function publishedResult(
  result: {
    direction: 'up' | 'down' | 'flat';
    percent: number;
    withinNormal: boolean;
    label: string;
    device: string;
    disclaimer: string;
    framing: string;
  } | null,
  displayName: string | null,
): OgResult | null {
  if (!result) return null;
  const steady = result.withinNormal || result.direction === 'flat';
  return {
    value: steady ? 'Steady' : `${Math.abs(result.percent)}%`,
    word: steady ? 'within normal variation' : result.direction === 'down' ? 'lower' : 'higher',
    label: result.label,
    device: result.device,
    disclaimer: result.disclaimer,
    kicker: displayName ? `What changed for ${displayName}` : result.framing,
  };
}

export function resultWindow(result: OgResult): string {
  return `12 weeks before against 12 weeks after, measured on ${result.device}. ${result.disclaimer}.`;
}

export function ogSvg(input: OgInput): string {
  const tone = scoreTone(input.score);
  const panelFrom = tone === 'good' ? TEAL : SLATE;
  const panelTo = tone === 'good' ? TEAL_DEEP : SLATE_DEEP;
  const rows = input.composition.slice(0, input.result ? 3 : 4);
  const titleSize = input.result ? 44 : 56;
  const title = wrap(input.stackName, titleSize, 590, input.result ? 1 : 2);
  const titleY = input.result ? 156 : 176;
  const titleText = title
    .map(
      (line, index) =>
        `<text x="64" y="${titleY + index * (titleSize + 8)}" font-family="Inter" font-weight="700" font-size="${titleSize}" fill="${INK}" letter-spacing="-1.4">${escapeXml(line)}</text>`,
    )
    .join('');
  const byline = `${input.creator}, ${input.productCount} ${input.productCount === 1 ? 'product' : 'products'}`;
  const bylineY = titleY + (title.length - 1) * (titleSize + 8) + 42;
  const ctaY = 562;
  const resultY = bylineY + 22;
  const resultH = 118;
  const rowsTop = input.result ? resultY + resultH + 28 : ctaY - 24 - rows.length * 44;
  const composition = compositionRows(rows, 64, rowsTop, { nameWidth: 168, barX: 246, barWidth: 230, fontSize: 22 });
  const result = input.result ? wideResult(input.result, 64, resultY, 580, resultH) : '';
  const circumference = 2 * Math.PI * 112;
  const dash = (Math.max(0, Math.min(100, input.score)) / 100) * circumference;
  const summary = wrap(input.summary, 22, 380, 3)
    .map(
      (line, index) =>
        `<text x="932" y="${478 + index * 28}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="22" fill="#FFFFFF" fill-opacity="0.9">${escapeXml(line)}</text>`,
    )
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}" viewBox="0 0 ${OG_WIDTH} ${OG_HEIGHT}">
<defs>
  <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${panelFrom}"/>
    <stop offset="1" stop-color="${panelTo}"/>
  </linearGradient>
</defs>
<rect width="${OG_WIDTH}" height="${OG_HEIGHT}" fill="#FFFFFF"/>
<rect x="0" y="0" width="${OG_WIDTH}" height="12" fill="${TEAL}"/>
${brand(64, 40, 48)}
<text x="128" y="74" font-family="Inter" font-weight="700" font-size="32" fill="${INK}" letter-spacing="-0.6">Stack</text>
${titleText}
<text x="64" y="${bylineY}" font-family="Inter" font-weight="500" font-size="26" fill="${MUTED}">${escapeXml(truncate(byline, 26, 590))}</text>
${result}
${composition}
<rect x="64" y="${ctaY}" width="520" height="48" rx="16" fill="${TEAL}"/>
<text x="324" y="${ctaY + 31}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="20" fill="#FFFFFF">Check your stack against this one</text>
<rect x="684" y="32" width="480" height="566" rx="40" fill="url(#panel)"/>
<circle cx="932" cy="250" r="168" fill="${panelTo}" fill-opacity="0.45"/>
<circle cx="932" cy="250" r="112" fill="none" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="22"/>
<circle cx="932" cy="250" r="112" fill="none" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 932 250)"/>
<text x="932" y="268" text-anchor="middle" font-family="Inter" font-weight="700" font-size="92" fill="#FFFFFF" letter-spacing="-3">${input.score}</text>
<text x="932" y="302" text-anchor="middle" font-family="Inter" font-weight="500" font-size="20" fill="#FFFFFF" fill-opacity="0.78">out of 100</text>
<text x="932" y="430" text-anchor="middle" font-family="Inter" font-weight="700" font-size="26" fill="#FFFFFF">Dose audit</text>
${summary}
</svg>`;
}

export function storySvg(input: OgInput): string {
  const tone = scoreTone(input.score);
  const panelFrom = tone === 'good' ? TEAL : SLATE;
  const panelTo = tone === 'good' ? TEAL_DEEP : SLATE_DEEP;
  const pad = 84;
  const inner = STORY_WIDTH - pad * 2;
  const title = wrap(input.stackName, 64, inner, 2);
  const titleY = 250;
  const titleText = title
    .map(
      (line, index) =>
        `<text x="${pad}" y="${titleY + index * 76}" font-family="Inter" font-weight="700" font-size="64" fill="${INK}" letter-spacing="-2">${escapeXml(line)}</text>`,
    )
    .join('');
  const bylineY = titleY + (title.length - 1) * 76 + 58;
  const byline = `${input.creator}, ${input.productCount} ${input.productCount === 1 ? 'product' : 'products'}`;
  const ctaY = 1688;
  const rows = input.composition.slice(0, 4);
  const rowH = 72;
  const compTop = ctaY - 40 - rows.length * rowH;
  const resultH = input.result ? 250 : 0;
  const resultY = compTop - (input.result ? resultH + 56 : 0);
  const panelTop = bylineY + 36;
  const panelBottom = (input.result ? resultY : compTop) - 28;
  const panelH = Math.max(420, panelBottom - panelTop);
  const ringR = Math.min(150, Math.round((panelH - 220) / 2));
  const ringCy = panelTop + Math.round(panelH / 2) - 36;
  const circumference = 2 * Math.PI * ringR;
  const dash = (Math.max(0, Math.min(100, input.score)) / 100) * circumference;
  const summaryLines = wrap(input.summary, 26, inner - 80, 2);
  const summaryY = Math.min(panelTop + panelH - 36 - (summaryLines.length - 1) * 34, ringCy + ringR + 88);
  const summary = summaryLines
    .map(
      (line, index) =>
        `<text x="${STORY_WIDTH / 2}" y="${summaryY + index * 34}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="26" fill="#FFFFFF" fill-opacity="0.9">${escapeXml(line)}</text>`,
    )
    .join('');
  const composition = rows
    .map((row, index) => {
      const y = compTop + index * rowH;
      const ratio = row.ofLimit == null ? null : Math.max(0, row.ofLimit);
      const colour = barColour(ratio);
      const name = truncate(row.name, 26, inner - 120);
      const pct = ratio == null ? 'No upper limit' : `${Math.round(ratio * 100)}%`;
      const pctColour = ratio != null && ratio > 1 ? OVER : MUTED;
      const fill = ratio == null ? 0 : Math.min(1, ratio) * inner;
      const bar =
        ratio == null
          ? ''
          : `<rect x="${pad}" y="${y + 16}" width="${inner}" height="16" rx="8" fill="${TRACK}"/><rect x="${pad}" y="${y + 16}" width="${Math.max(16, fill).toFixed(0)}" height="16" rx="8" fill="${colour}"/>`;
      return `<text x="${pad}" y="${y}" font-family="Inter" font-weight="500" font-size="26" fill="${INK}">${escapeXml(name)}</text><text x="${STORY_WIDTH - pad}" y="${y}" text-anchor="end" font-family="Inter" font-weight="500" font-size="24" fill="${pctColour}">${escapeXml(pct)}</text>${bar}`;
    })
    .join('');
  const result = input.result ? storyResult(input.result, pad, resultY, inner, resultH) : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STORY_WIDTH}" height="${STORY_HEIGHT}" viewBox="0 0 ${STORY_WIDTH} ${STORY_HEIGHT}">
<defs>
  <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${panelFrom}"/>
    <stop offset="1" stop-color="${panelTo}"/>
  </linearGradient>
</defs>
<rect width="${STORY_WIDTH}" height="${STORY_HEIGHT}" fill="#FFFFFF"/>
<rect x="0" y="0" width="${STORY_WIDTH}" height="16" fill="${TEAL}"/>
${brand(pad, 128, 56)}
<text x="${pad + 72}" y="168" font-family="Inter" font-weight="700" font-size="36" fill="${INK}" letter-spacing="-0.6">Stack</text>
${titleText}
<text x="${pad}" y="${bylineY}" font-family="Inter" font-weight="500" font-size="28" fill="${MUTED}">${escapeXml(truncate(byline, 28, inner))}</text>
<rect x="${pad}" y="${panelTop}" width="${inner}" height="${panelH}" rx="40" fill="url(#panel)"/>
<circle cx="${STORY_WIDTH / 2}" cy="${ringCy}" r="${ringR + 48}" fill="${panelTo}" fill-opacity="0.4"/>
<circle cx="${STORY_WIDTH / 2}" cy="${ringCy}" r="${ringR}" fill="none" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="24"/>
<circle cx="${STORY_WIDTH / 2}" cy="${ringCy}" r="${ringR}" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 ${STORY_WIDTH / 2} ${ringCy})"/>
<text x="${STORY_WIDTH / 2}" y="${ringCy + Math.round(ringR * 0.22)}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="${Math.round(ringR * 0.72)}" fill="#FFFFFF" letter-spacing="-3">${input.score}</text>
<text x="${STORY_WIDTH / 2}" y="${ringCy + Math.round(ringR * 0.52)}" text-anchor="middle" font-family="Inter" font-weight="500" font-size="22" fill="#FFFFFF" fill-opacity="0.78">out of 100</text>
<text x="${STORY_WIDTH / 2}" y="${summaryY - 40}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="28" fill="#FFFFFF">Dose audit</text>
${summary}
${result}
${composition}
<rect x="${pad}" y="${ctaY}" width="${inner}" height="84" rx="20" fill="${TEAL}"/>
<text x="${STORY_WIDTH / 2}" y="${ctaY + 52}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="30" fill="#FFFFFF">Check your stack against this one</text>
</svg>`;
}

function wideResult(result: OgResult, x: number, y: number, width: number, height: number): string {
  const headline = wrap(`${result.label} ${result.word}`, 22, width - estimateWidth(result.value, 40) - 80, 2);
  const textX = x + 28 + estimateWidth(result.value, 40) + 16;
  const headlineText = headline
    .map(
      (line, index) =>
        `<text x="${textX}" y="${y + 50 + index * 26}" font-family="Inter" font-weight="700" font-size="22" fill="${INK}">${escapeXml(line)}</text>`,
    )
    .join('');
  const windowText = wrap(resultWindow(result), 16, width - 48, 2)
    .map(
      (line, index) =>
        `<text x="${x + 24}" y="${y + 88 + index * 20}" font-family="Inter" font-weight="500" font-size="16" fill="${MUTED}">${escapeXml(line)}</text>`,
    )
    .join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="20" fill="${TEAL_SOFT}"/>
<text x="${x + 24}" y="${y + 58}" font-family="Inter" font-weight="700" font-size="40" fill="${INK}" letter-spacing="-1.5">${escapeXml(result.value)}</text>
${headlineText}
${windowText}`;
}

function storyResult(result: OgResult, x: number, y: number, width: number, height: number): string {
  const headline = wrap(`${result.label} ${result.word}`, 30, width - 56, 1);
  const windowLines = wrap(resultWindow(result), 22, width - 56, 2);
  const headlineText = headline
    .map((line) => `<text x="${x + 28}" y="${y + 162}" font-family="Inter" font-weight="700" font-size="30" fill="${INK}">${escapeXml(line)}</text>`)
    .join('');
  const windowText = windowLines
    .map(
      (line, index) =>
        `<text x="${x + 28}" y="${y + 200 + index * 28}" font-family="Inter" font-weight="500" font-size="22" fill="${MUTED}">${escapeXml(line)}</text>`,
    )
    .join('');
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="28" fill="${TEAL_SOFT}"/>
<text x="${x + 28}" y="${y + 36}" font-family="Inter" font-weight="700" font-size="20" fill="${TEAL_DEEP}">${escapeXml(result.kicker)}</text>
<text x="${x + 28}" y="${y + 114}" font-family="Inter" font-weight="700" font-size="64" fill="${INK}" letter-spacing="-2">${escapeXml(result.value)}</text>
${headlineText}
${windowText}`;
}

function compositionRows(
  rows: { name: string; ofLimit: number | null }[],
  x: number,
  top: number,
  box: { nameWidth: number; barX: number; barWidth: number; fontSize: number },
): string {
  return rows
    .map((row, index) => {
      const y = top + index * 44;
      const ratio = row.ofLimit == null ? null : Math.max(0, row.ofLimit);
      const name = truncate(row.name, box.fontSize, box.nameWidth);
      const colour = barColour(ratio);
      const pct = ratio == null ? '' : `${Math.round(ratio * 100)}%`;
      const pctColour = ratio != null && ratio > 1 ? OVER : MUTED;
      const fill = ratio == null ? 0 : Math.min(1, ratio) * box.barWidth;
      const bar =
        ratio == null
          ? `<text x="${box.barX}" y="${y + 8}" font-family="Inter" font-weight="500" font-size="20" fill="${MUTED}">No upper limit</text>`
          : `<rect x="${box.barX}" y="${y - 8}" width="${box.barWidth}" height="16" rx="8" fill="${TRACK}"/><rect x="${box.barX}" y="${y - 8}" width="${Math.max(16, fill).toFixed(0)}" height="16" rx="8" fill="${colour}"/><text x="${box.barX + box.barWidth + 14}" y="${y + 6}" font-family="Inter" font-weight="500" font-size="18" fill="${pctColour}">${pct}</text>`;
      return `<text x="${x}" y="${y + 8}" font-family="Inter" font-weight="500" font-size="${box.fontSize}" fill="${INK}">${escapeXml(name)}</text>${bar}`;
    })
    .join('');
}

function barColour(ratio: number | null): string {
  if (ratio == null) return TEAL;
  if (ratio > 1) return OVER;
  if (ratio >= 0.9) return NEAR;
  return TEAL;
}

function brand(x: number, y: number, size: number): string {
  const pad = Math.round(size * 0.22);
  const barH = Math.max(4, Math.round(size * 0.12));
  const gap = Math.round(size * 0.1);
  const barW = size - pad * 2;
  const bars = [1, 0.8, 0.6]
    .map((opacity, index) => {
      const by = y + pad + index * (barH + gap);
      return `<rect x="${x + pad}" y="${by}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="#FFFFFF" fill-opacity="${opacity}"/>`;
    })
    .join('');
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${Math.round(size * 0.28)}" fill="${TEAL}"/>${bars}`;
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

export async function renderOgPng(svg: string, assets: OgAssets, width = OG_WIDTH): Promise<Uint8Array> {
  const { initWasm, Resvg } = await import('@resvg/resvg-wasm');
  if (!ready) {
    ready = initWasm(assets.wasm).catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  await ready;
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontBuffers: assets.fonts, defaultFontFamily: 'Inter', sansSerifFamily: 'Inter' },
  });
  const png = resvg.render().asPng();
  resvg.free();
  return png;
}
