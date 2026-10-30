---
name: design
description: Use when running a design pass on Stack, including a run whose custom_mode is design. Holds the copy and layout rules, the current visual language, and a review checklist so any model restyles screens to the same standard.
---

Follow this skill for every Stack design pass, including when the run sets `custom_mode` to `design`. Before editing, read `language.md` and `checklist.md` in this folder. They describe the tokens and components that already exist, and the review bar.

Stack is an iOS-first Expo app. Most screens are Operate: a person is auditing a stack, copying one, or reading a result. The public share page is the one Persuade surface, and it still uses this same language. Refine what is there. Do not restyle the app into a new theme.

## Hard rules

These are fixed. A design pass does not relax them.

- Light and neutral. White cards on the light canvas, deep teal as the only primary, amber only for savings and prices. No dark theme, no purple, no extra brand colours.
- Sentence case on every label, title, button, and heading. Hierarchy comes from weight and size.
- No all caps. Do not set `textTransform` to `uppercase`, and do not track small labels out with wide letter spacing.
- No eyebrow labels. A small line above a title is not a heading. Tab screens must not repeat the tab name.
- No em dash (U+2014) and no en dash (U+2013) in copy, strings, comments, docs, commits, or pull requests. Use a comma, full stop, colon, parentheses, or a hyphen. Write a range as "2 to 4".
- No emoji, in the product or in code strings.
- No house icon. The Stack tab uses `layers-outline`. The mark is three white bars in a teal rounded square (the public page `.mark`, and the same mark in `server/src/og.ts`).
- Main tabs have no page title and no breadcrumb. `headerShown` is false in `app/app/(tabs)/_layout.tsx`. Detail screens keep a title and `BackButton`.
- One add control. The "Add supplement" bar on My Stack, plus the empty-state line "Add a supplement" on that same screen. Audit, Impact, More, and the report do not add products. Enforced by `app/src/copy/addPlacement.test.ts`.
- No fake urgency and no fake social proof. No countdown, no "popular", no "copied by 0 people". "Kept by N people" stays hidden below 3.
- The audit score is doses and overlaps only. It never takes price. The Pro savings figure is a separate dollar amount, and it is the only place amber means money. Formula: `docs/audit-score.md`, implementation: `shared/auditScore.ts`.

## Reference surfaces

Match these. Do not invent a parallel style.

- Share sheet, score hero, result hero, meters, Discover cards, merge preview: `app/src/components/share.tsx`, screens in `app/app/share.tsx`, `app/app/s/[slug].tsx`, `app/app/discover.tsx`.
- Primitives: `app/src/components/ui.tsx` (`T`, `Screen`, `Card`, `Button`, `Pill`, `BackButton`).
- Public page and the 1200 by 630 preview: `server/src/sharePage.ts`, `server/src/og.ts`.
- Tokens: `app/src/theme.ts`. Copy strings: `app/src/copy/`.

## Workflow

1. Read the screen you are changing and the component it already uses. Note the one job of the screen.
2. Capture a before screenshot at a phone width (about 390) and, for a layout change, a narrow and a wide web viewport. Scroll views inside the app do not grow the page, so set the viewport to the scroll height before shooting. Save `before-<screen>.png`.
3. Change the smallest surface that fixes the problem. Reuse tokens and components. Do not add a native module. Motion uses React Native `Animated` only, so an over-the-air update can ship it.
4. Capture after screenshots of the same states, including empty, error, and the low-score case (slate, not teal) when the score is on screen.
5. Review against `checklist.md`. Check contrast on the real background, and check that larger text does not clip. Leave `allowFontScaling` on, except the numeral drawn inside `ScoreRing` and `ScoreBadge`, which is sized to the ring.
6. Run the copy checks from the repo root, then the app and Worker checks you touched. Keep CI green.

```bash
npm run check:dashes    # em dash and en dash, every tracked text file
npm run check:case      # no textTransform uppercase
npm run check:emoji     # no emoji in app/, server/src/, and shared/ source
```

Search for a house icon and for uppercase styling when you touch navigation or labels:

```bash
rg -n "home-outline|name=\"home\"" app server shared
```

App: `npx tsc --noEmit`, `npx expo lint`, `npx vitest run` in `app/`. Worker, when `server/` changed: the same three in `server/`. Do not deploy the Worker, apply migrations, or publish an EAS Update as part of a design pass.
