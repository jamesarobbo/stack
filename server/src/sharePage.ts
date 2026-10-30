import type { AggregateResult, PersonalResult } from './outcome';

export type ShareViewProduct = {
  name: string;
  brand: string;
  servingsPerDay: number;
  ingredients: { name: string; amount: number; unit: string }[];
};

export type ShareView = {
  slug: string;
  displayName: string | null;
  products: ShareViewProduct[];
  auditScore: number;
  result: PersonalResult | null;
  copyCount: number;
  aggregate: AggregateResult | null;
  publicIndex: boolean;
};

export function renderSharePage(view: ShareView | null): string {
  const noindex = view?.publicIndex ? '' : '<meta name="robots" content="noindex">';
  const body = view ? pageBody(view) : '<main><h1>This stack is no longer shared.</h1></main>';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${noindex}
<title>Shared stack</title>
<style>
  body { margin: 0; background: #F4F5F7; color: #16181D; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  main { max-width: 440px; margin: 0 auto; padding: 32px 20px 56px; }
  h1 { font-size: 30px; line-height: 1.15; letter-spacing: -0.5px; margin: 0 0 8px; }
  h2 { font-size: 16px; margin: 0 0 8px; }
  p { margin: 0 0 8px; }
  .muted { color: #667085; font-size: 14px; line-height: 1.4; }
  .card { background: #fff; border-radius: 16px; padding: 16px; margin: 12px 0; }
  .score { font-size: 42px; line-height: 1; font-weight: 700; color: #0E7C6B; letter-spacing: -1px; }
  .button { display: block; background: #0E7C6B; color: #fff; text-align: center; padding: 14px 16px; border-radius: 14px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  .dose { font-size: 14px; margin: 2px 0; }
  .name { font-weight: 600; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

function pageBody(view: ShareView): string {
  const who = view.displayName ? escapeHtml(view.displayName) : 'A Stack user';
  const products = view.products
    .map((product) => {
      const doses = product.ingredients
        .map((ingredient) => `<p class="dose">${escapeHtml(ingredient.name)}: ${escapeHtml(formatAmount(ingredient.amount))} ${escapeHtml(ingredient.unit)}</p>`)
        .join('');
      const brand = product.brand ? `<p class="muted">${escapeHtml(product.brand)}</p>` : '';
      return `<div class="card"><p class="name">${escapeHtml(product.name)}</p>${brand}${doses}<p class="muted">${escapeHtml(formatServings(product.servingsPerDay))}</p></div>`;
    })
    .join('');
  const result = view.result
    ? `<div class="card"><h2>${escapeHtml(view.result.framing)}</h2><p>${escapeHtml(view.result.line)}</p><p class="muted">${escapeHtml(view.result.disclaimer)}</p></div>`
    : '';
  const aggregate = view.aggregate
    ? `<div class="card"><h2>People who copied this</h2><p>${escapeHtml(view.aggregate.line)}</p><p class="muted">${escapeHtml(view.aggregate.disclaimer)}</p></div>`
    : '';
  return `<main>
<h1>Shared stack</h1>
<p class="muted">${who}</p>
<div class="card"><p class="muted">Audit score</p><p class="score">${view.auditScore}</p><p class="muted">From doses and overlaps only. Price is not part of this score.</p></div>
${products}
${result}
<p class="muted">${escapeHtml(copyLabel(view.copyCount))}</p>
${aggregate}
<p>Ask your doctor before changing your supplements.</p>
<a class="button" href="stack://s/${escapeHtml(view.slug)}">Open in Stack</a>
</main>`;
}

function copyLabel(count: number): string {
  if (count === 1) return 'Copied by 1 person';
  return `Copied by ${count} people`;
}

function formatServings(value: number): string {
  const shown = Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
  return `${shown} a day`;
}

function formatAmount(value: number): string {
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  return rounded.toLocaleString('en-US');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
