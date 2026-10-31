Follow this skill for every Stack design pass, including when the run sets `custom_mode` to `design`. Before editing, read `language.md` and `checklist.md` in this folder. They describe the tokens and components that already exist, and the review bar.

Stack is an iOS-first Expo app. Most screens are Operate: a person is auditing a stack, copying one, or reading a result. The public share page is the one Persuade surface, and it uses this same language. Apple minimal is the visual language, in light and dark, following the phone. Refine what is there. Do not invent a parallel theme.

## Hard rules

These are fixed. A design pass does not relax them.

- Apple minimal. System grey groups in light (`#F2F2F7` and white cards) and black with `#1C1C1E` cards in dark. One blue for filled buttons (`#0066CC` in both modes). Links follow the mode: `#0066CC` in light, `#64B5FF` in dark. Gold only for savings and prices. A score under 80 is a neutral ring, never green. Category colours are for data (sleep, heart rate, a dose near the limit), not extra brand chrome.
- The system font. Weight and size carry the hierarchy. Do not load a second family in the app. The preview images may bundle Inter, because the rasteriser has no system font.
- Grouped cards, about a 12 point radius. Buttons are about 14. Pills are fully rounded. Shadows stay soft and neutral.
- No bottle drawings and no clay. Product rows use a simple capsule line. Empty states are type.
- Sentence case on every label, title, button, and heading. Hierarchy comes from weight and size.
- No all caps. Do not set `textTransform` to `uppercase`, and do not track small labels out with wide letter spacing.
- No eyebrow labels. A small line above a title is not a heading. Tab screens must not repeat the tab name.
- No em dash (U+2014) and no en dash (U+2013) in copy, strings, comments, docs, commits, or pull requests. Use a comma, full stop, colon, parentheses, or a hyphen. Write a range as "2 to 4".
- No emoji, in the product or in code strings.
- No house icon. The Stack tab uses `layers-outline`. The mark is three white bars in a deep green rounded square (`#0E7A45`), including in dark mode.
- Main tabs have no page title and no breadcrumb. `headerShown` is false in `app/app/(tabs)/_layout.tsx`. Detail screens keep a title and `BackButton`.
- Five tabs, in this order: Stack (`layers-outline`), Discover (`compass-outline`), Audit (`search-outline`), Impact (`stats-chart-outline`), More (`ellipsis-horizontal`). Discover is a tab. Do not put it back as a link on My Stack. Do not add a sixth tab.
- One add control. The "Add supplement" bar on My Stack is the only add control on that screen, including the empty state. The share icon at the top right is not an add control. Audit, Impact, More, and the report do not add products. Enforced by `app/src/copy/addPlacement.test.ts`.
- No fake urgency and no fake social proof. No countdown, no "popular", no "copied by 0 people". "Copied by N people" stays hidden below 3.
- The audit score is doses and overlaps only. It never takes price. The Pro savings figure is a separate dollar amount, and gold is the only money colour. Formula: `docs/audit-score.md`, implementation: `shared/auditScore.ts`. Discover Top does not rank by price or by wearable results.

## Reference surfaces

Match these. Do not invent a parallel style.

- Share sheet, score hero, result hero, meters, Discover cards, merge preview: `app/src/components/share.tsx`, screens in `app/app/share.tsx`, `app/app/s/[slug].tsx`, `app/app/(tabs)/discover.tsx`.
- Primitives: `app/src/components/ui.tsx` (`T`, `Screen`, `Card`, `Button`, `ShareButton`, `Pill`, `BackButton`, `ProductRow`).
- Public page and the 1200 by 630 preview: `server/src/sharePage.ts`, `server/src/og.ts`. Posted images use the light palette.
- Tokens: `app/src/theme.ts` (`useTheme`, light and dark). Copy strings: `app/src/copy/`.

## Workflow

1. Read the screen you are changing and the component it already uses. Note the one job of the screen.
2. Capture a before screenshot at a phone width (about 390) and, for a layout change, a narrow and a wide web viewport. Scroll views inside the app do not grow the page, so set the viewport to the scroll height before shooting. Save `before-<screen>.png`. Check both light and dark when the screen uses colour.
3. Change the smallest surface that fixes the problem. Read colours from `useTheme()` at render time. Do not bake a colour into `StyleSheet.create` at module load. Do not add a native module. Motion uses React Native `Animated` only, so an over-the-air update can ship it.
4. Capture after screenshots of the same states, including empty, error, and the low-score case (neutral ring, not green) when the score is on screen. Include dark when the change is visual.
5. Review against `checklist.md`. Check contrast in both modes. Leave `allowFontScaling` on, except the numeral drawn inside `ScoreRing` and `ScoreBadge`, which is sized to the ring. Do not put text on a gold fill. Gold copy sits on the wash in light, and on the card in dark.
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

`userInterfaceStyle`, the splash background, and the Android adaptive icon background are native. Changing them needs a new build. Say so when you change them.
