import { OFF_ATTRIBUTION } from './off';
import { GOAL_LABELS, LIBRARY_GOALS, type LibraryGoal } from './library';
import { scoreTone } from './og';
import type { ShareView } from './sharing';

export type PageContext = {
  origin: string;
  appStoreId: string | null;
};

const DISCLAIMER = 'Educational, not medical advice. Does not diagnose, treat, or prescribe.';

export function renderSharePage(view: ShareView | null, context: PageContext): string {
  if (!view) return missingPage(context);
  const url = `${context.origin}/s/${view.slug}`;
  const who = view.displayName ?? 'A Stack user';
  const count = view.products.length;
  const title = `${view.stackName}, shared on Stack`;
  const description = `${count} ${count === 1 ? 'supplement' : 'supplements'} from ${who}, with daily doses checked against upper limits. Audit score ${view.auditScore} out of 100.`;
  const image = `${context.origin}/s/${view.slug}/og.png?v=${view.version}`;
  const head = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}">`,
    view.listed ? `<link rel="canonical" href="${escapeHtml(url)}">` : '<meta name="robots" content="noindex">',
    context.appStoreId ? `<meta name="apple-itunes-app" content="app-id=${escapeHtml(context.appStoreId)}, app-argument=${escapeHtml(url)}">` : '',
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Stack">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${escapeHtml(`${view.stackName}. Audit score ${view.auditScore} out of 100.`)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
  ]
    .filter(Boolean)
    .join('\n');
  return document(head, pageBody(view, context));
}

function document(head: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FFFFFF">
${head}
<style>${STYLES}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function missingPage(context: PageContext): string {
  const store = context.appStoreId ? `https://apps.apple.com/app/id${encodeURIComponent(context.appStoreId)}` : null;
  const body = `<main class="wrap">
${brandBar(null)}
<section class="empty rise">
  <h1>This stack is no longer shared</h1>
  <p class="muted">The person who shared it turned the link off.</p>
  ${store ? `<a class="cta" href="${escapeHtml(store)}">Get Stack</a>` : ''}
</section>
</main>`;
  return document('<title>Stack</title>\n<meta name="robots" content="noindex">', body);
}

function brandBar(openHref: string | null): string {
  return `<header class="bar">
  <span class="brand"><span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>Stack</span>
  ${openHref ? `<a class="open" href="${escapeHtml(openHref)}">Open in app</a>` : ''}
</header>`;
}

function pageBody(view: ShareView, context: PageContext): string {
  const who = view.displayName ? escapeHtml(view.displayName) : 'A Stack user';
  const openHref = `stack://s/${view.slug}`;
  const getHref = `/s/${view.slug}/get`;
  const goals = view.goals
    .filter((goal): goal is LibraryGoal => (LIBRARY_GOALS as readonly string[]).includes(goal))
    .map((goal) => `<span class="chip">${escapeHtml(GOAL_LABELS[goal])}</span>`)
    .join('');
  const tone = scoreTone(view.auditScore);
  const circumference = 2 * Math.PI * 52;
  const dash = ((Math.max(0, Math.min(100, view.auditScore)) / 100) * circumference).toFixed(1);
  const reasons = view.score.reasons
    .filter((reason) => reason.kind !== 'unchecked')
    .slice(0, 5)
    .map((reason) => `<li class="reason ${reason.kind}"><span class="dot" aria-hidden="true"></span>${escapeHtml(reason.text)}</li>`)
    .join('');
  const doses = view.score.totals
    .slice(0, 10)
    .map((total) => {
      const amount = `${formatAmount(total.amount)} ${escapeHtml(total.unit)}`.trim();
      if (total.ofLimit == null) {
        return `<li class="dose"><span class="dose-name">${escapeHtml(total.name)}</span><span class="dose-amount">${amount} a day</span><span class="nolimit">No upper limit set</span></li>`;
      }
      const pct = Math.round(total.ofLimit * 100);
      const width = Math.max(4, Math.min(100, pct));
      const state = pct > 100 ? 'over' : pct >= 90 ? 'near' : 'ok';
      return `<li class="dose"><span class="dose-name">${escapeHtml(total.name)}</span><span class="dose-amount">${amount} a day</span><span class="meter ${state}" role="img" aria-label="${pct}% of the upper limit"><span style="width:${width}%"></span></span><span class="pct ${state}">${pct}% of limit</span></li>`;
    })
    .join('');
  const products = view.products
    .map((product) => {
      const perDay = product.servingsPerDay;
      const lines = product.ingredients
        .slice(0, 8)
        .map((ingredient) => `${escapeHtml(ingredient.name)} ${escapeHtml(formatAmount(ingredient.amount * perDay))} ${escapeHtml(ingredient.unit)}`)
        .join(', ');
      const brand = product.brand ? `<span class="muted">${escapeHtml(product.brand)}</span>` : '';
      return `<li class="product"><div><p class="product-name">${escapeHtml(product.name)}</p>${brand}</div><p class="muted small">${escapeHtml(formatServings(perDay))}${lines ? `. ${lines} a day` : ''}</p></li>`;
    })
    .join('');
  const result = view.result
    ? `<section class="card teaser rise d3"><p class="teaser-title">${who} tracked a personal result</p><p class="muted">A before and after reading from Apple Health, for 1 person. It is shown in the Stack app.</p></section>`
    : '';
  const kept = view.copyCount != null ? `<p class="kept">Kept by ${view.copyCount} people who copied it</p>` : '';
  const changes =
    view.updatedOn && view.changes.length > 0
      ? `<details class="changes"><summary>Updated on ${escapeHtml(formatDate(view.updatedOn))}</summary><ul>${view.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join('')}</ul></details>`
      : '';
  const off = view.openFoodFacts ? `<p class="muted small">${escapeHtml(OFF_ATTRIBUTION)}</p>` : '';
  const store = context.appStoreId ? 'Get Stack on the App Store' : 'Open it in Stack';
  return `<main class="wrap">
${brandBar(openHref)}
<section class="hero rise">
  <h1>${escapeHtml(view.stackName)}</h1>
  <p class="byline">${who}, ${view.products.length} ${view.products.length === 1 ? 'product' : 'products'}</p>
  ${goals ? `<div class="chips">${goals}</div>` : ''}
  ${kept}
</section>
<section class="card score-card ${tone} rise d1">
  <div class="ring" aria-label="Audit score ${view.auditScore} out of 100">
    <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <circle cx="60" cy="60" r="52" class="track"/>
      <circle cx="60" cy="60" r="52" class="arc" style="--dash:${dash};--full:${circumference.toFixed(1)}" transform="rotate(-90 60 60)"/>
    </svg>
    <span class="score">${view.auditScore}</span>
    <span class="of">out of 100</span>
  </div>
  <div class="score-text">
    <p class="score-title">${escapeHtml(view.score.summary)}</p>
    <p class="muted small">Dose audit from daily totals and overlaps. Price is not part of it.</p>
  </div>
  ${reasons ? `<ul class="reasons">${reasons}</ul>` : ''}
</section>
<a class="cta rise d2" href="${escapeHtml(getHref)}">Check your stack against this one</a>
<p class="cta-note muted small rise d2">${escapeHtml(store)}. Copying shows what overlaps with what you already take.</p>
<section class="card rise d2">
  <h2>Daily doses</h2>
  <ul class="doses">${doses}</ul>
</section>
${result}
<section class="card rise d3">
  <h2>Products</h2>
  <ul class="products">${products}</ul>
  ${changes}
</section>
<footer class="foot">
  <p>Ask your doctor before changing your supplements.</p>
  <p class="muted small">${DISCLAIMER} To report this stack, open it in the Stack app.</p>
  ${off}
</footer>
</main>`;
}

function formatServings(value: number): string {
  const shown = Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
  return `${shown} a day`;
}

function formatAmount(value: number): string {
  const rounded = value >= 100 ? Math.round(value) : Math.round(value * 100) / 100;
  return rounded.toLocaleString('en-US');
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STYLES = `
:root { --teal:#0E7C6B; --teal-deep:#0A5C50; --teal-soft:#E5F5F1; --ink:#16181D; --muted:#667085; --line:#EEF0F3; --slate:#344054; --over:#B42318; --over-soft:#FDECEC; --near:#7A5200; --near-soft:#FFF6E4; }
* { box-sizing: border-box; }
body { margin: 0; background: #FFFFFF; color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }
.wrap { max-width: 480px; margin: 0 auto; padding: 12px 20px 48px; }
.bar { display: flex; align-items: center; justify-content: space-between; padding: 8px 0 20px; }
.brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; font-size: 18px; letter-spacing: -0.3px; }
.mark { width: 28px; height: 28px; border-radius: 8px; background: var(--teal); display: inline-flex; flex-direction: column; justify-content: center; gap: 2px; padding: 0 6px; }
.mark i { display: block; height: 4px; border-radius: 2px; background: #fff; }
.mark i:nth-child(2) { opacity: .8; } .mark i:nth-child(3) { opacity: .6; }
.open { font-size: 14px; font-weight: 600; color: var(--teal); text-decoration: none; padding: 8px 12px; border-radius: 999px; background: var(--teal-soft); }
h1 { font-size: 34px; line-height: 1.1; letter-spacing: -0.8px; margin: 0 0 8px; }
h2 { font-size: 17px; margin: 0 0 12px; letter-spacing: -0.2px; }
p { margin: 0; line-height: 1.45; }
.muted { color: var(--muted); }
.small { font-size: 14px; }
.byline { color: var(--muted); font-size: 16px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
.chip { font-size: 13px; font-weight: 600; color: var(--teal-deep); background: var(--teal-soft); border-radius: 999px; padding: 6px 12px; }
.kept { margin-top: 14px; font-size: 14px; font-weight: 600; color: var(--teal); }
.card { background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 18px; margin: 16px 0; box-shadow: 0 1px 2px rgba(16,24,40,.04); }
.score-card { display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: center; color: #fff; border: 0; background: linear-gradient(135deg, var(--teal), var(--teal-deep)); }
.score-card.neutral { background: linear-gradient(135deg, var(--slate), #1D2939); }
.ring { position: relative; width: 120px; height: 120px; display: grid; place-items: center; }
.ring svg { position: absolute; inset: 0; }
.track { fill: none; stroke: rgba(255,255,255,.18); stroke-width: 12; }
.arc { fill: none; stroke: #fff; stroke-width: 12; stroke-linecap: round; stroke-dasharray: var(--dash) var(--full); animation: draw 1.1s cubic-bezier(.2,.7,.2,1) both .15s; }
.score { font-size: 44px; font-weight: 700; letter-spacing: -2px; line-height: 1; margin-top: -10px; }
.of { position: absolute; bottom: 30px; font-size: 12px; opacity: .78; }
.score-title { font-size: 18px; font-weight: 700; line-height: 1.3; }
.score-card .muted { color: rgba(255,255,255,.78); margin-top: 6px; }
.reasons { grid-column: 1 / -1; list-style: none; padding: 12px 0 0; margin: 0; border-top: 1px solid rgba(255,255,255,.18); display: grid; gap: 8px; }
.reason { display: flex; gap: 10px; align-items: baseline; font-size: 14px; line-height: 1.4; }
.reason .dot { flex: 0 0 8px; height: 8px; border-radius: 4px; background: rgba(255,255,255,.55); transform: translateY(-1px); }
.reason.over .dot { background: #FDA29B; } .reason.near .dot { background: #FEC84B; } .reason.overlap_ok .dot { background: #A6F4C5; }
.cta { display: block; background: var(--teal); color: #fff; text-align: center; padding: 16px; border-radius: 16px; text-decoration: none; font-weight: 700; font-size: 17px; box-shadow: 0 6px 16px rgba(14,124,107,.25); transition: transform .15s ease; }
.cta:active { transform: scale(.98); }
.cta-note { text-align: center; margin: 10px 8px 0; }
.doses, .products { list-style: none; padding: 0; margin: 0; display: grid; gap: 14px; }
.dose { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; }
.dose-name { font-weight: 600; font-size: 15px; }
.dose-amount { font-size: 14px; color: var(--muted); text-align: right; }
.meter { grid-column: 1 / 2; height: 8px; border-radius: 4px; background: #EEF1F4; overflow: hidden; align-self: center; }
.meter span { display: block; height: 100%; border-radius: 4px; background: var(--teal); transform-origin: left; animation: grow .9s cubic-bezier(.2,.7,.2,1) both .3s; }
.meter.near span { background: #DC9B04; } .meter.over span { background: var(--over); }
.pct { font-size: 13px; color: var(--muted); text-align: right; }
.pct.over { color: var(--over); font-weight: 600; } .pct.near { color: var(--near); font-weight: 600; }
.nolimit { grid-column: 1 / -1; font-size: 13px; color: var(--muted); }
.product { border-top: 1px solid var(--line); padding-top: 14px; display: grid; gap: 4px; }
.product:first-child { border-top: 0; padding-top: 0; }
.product-name { font-weight: 600; }
.teaser { background: var(--teal-soft); border-color: transparent; }
.teaser-title { font-weight: 700; margin-bottom: 4px; color: var(--teal-deep); }
.changes { margin-top: 16px; font-size: 14px; color: var(--muted); }
.changes summary { cursor: pointer; font-weight: 600; color: var(--ink); }
.changes ul { padding-left: 18px; margin: 8px 0 0; }
.foot { margin-top: 28px; display: grid; gap: 8px; }
.empty { padding: 40px 0; display: grid; gap: 12px; }
.rise { animation: rise .5s cubic-bezier(.2,.7,.2,1) both; }
.d1 { animation-delay: .06s; } .d2 { animation-delay: .12s; } .d3 { animation-delay: .18s; }
@keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes draw { from { stroke-dasharray: 0 var(--full); } }
@keyframes grow { from { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) { .rise, .arc, .meter span { animation: none; } }
`;
