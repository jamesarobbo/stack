# Visual language

Read this before drawing a new screen. Values below are the ones in the code. If a token and this file disagree, the token wins, then fix this file.

## Colour

Tokens live in `app/src/theme.ts`. The public page repeats them as CSS variables in `server/src/sharePage.ts`. The preview image repeats them in `server/src/og.ts`. Sharing tints that are not in `theme` live in `tint` in `app/src/components/share.tsx`.

| Role | Token | Hex | Use |
|---|---|---|---|
| Canvas | `theme.bg` | `#F4F5F7` | App screen background. The public page and the preview image are `#FFFFFF`. |
| Card | `theme.card` | `#FFFFFF` | Cards, product rows, buttons on ghost. |
| Ink | `theme.text` | `#16181D` | Body and titles. 17.8:1 on white. |
| Secondary | `theme.muted` | `#667085` | Help text. 5.0:1 on white, 4.6:1 on the canvas. This is the quietest text that may carry a sentence. |
| Faint | `theme.faint` | `#98A2B3` | Inactive chrome only. 2.6:1 on white, so it fails for reading. |
| Line | `theme.line` | `#E7E9EE` | Tab bar hairline. Card borders use `#EEF0F3`. |
| Teal | `theme.teal` | `#0E7C6B` | Primary buttons, links, selected chips, a score of 80 or more. White on teal is 5.1:1. |
| Teal pressed | `theme.tealDark` | `#0B6558` | Pressed teal. |
| Teal wash | `theme.tealSoft` | `#E5F5F1` | Result hero, icon bubble, selected row. Teal text on it is 4.5:1. |
| Slate | `tint.slate` | `#344054` | Scores under 80, so a low score never looks like a success. White on slate is 10.5:1. |
| Slate deep | `tint.slateDeep` | `#1D2939` | The far end of the low-score panel. |
| Amber | `theme.amber` | `#7A5200` | Savings and prices only. 6.9:1 on white, 6.4:1 on `amberBg` `#FFF6E4`, 5.8:1 on `amberPill` `#FDE8C0`. |
| Flag | `theme.flagText` | `#B42318` | A dose over the upper limit. 5.8:1 on `flagBg`, 6.6:1 on white. The public page and the preview image use the same red for an over-limit bar. |
| Near | `tint.nearBar` | `#DC9B04` | The meter fill from 90 percent of the limit. A fill, not a text colour. |

`scoreTone` in `app/src/components/share.tsx` and `server/src/og.ts` returns teal from 80 and slate below. Use it. Do not colour a score any other way.

Accent tints that already exist (teal wash, amber wash, flag wash, slate) are enough. Do not add a new hex.

## Type

Inter, loaded as `font.regular`, `font.medium`, `font.semibold`, `font.bold` in `theme.ts`. The public page uses Inter with system fallbacks. One family is a choice: weight and size carry the hierarchy. Do not add a display serif, and do not replace Inter.

`T` in `ui.tsx` sets `lineHeight` to 1.35 times the size. Default size is 16.

| Step | Size | Weight | Where |
|---|---|---|---|
| Page title | 34 web, about 28 in the app | bold | One per screen. Tracking about -0.8. |
| Section | 17 to 18 | semibold or bold | A group heading, sentence case. |
| Body | 16 | regular | |
| Button | 16 | semibold | |
| Secondary | 13 to 14 | regular or medium | `theme.muted` |
| Meta | 12 to 13 | semibold | Pills and reasons. Never all caps. |
| Score numeral | ring size times 0.36, or 44 on the web | bold | Tracking about -1.5. "out of 100" sits with it, smaller. |

Big numbers get tight tracking. Body text does not. Buttons are sentence case: "Copy to my stack", not "COPY".

## Space, radius, shadow

- Screen inset 20, content gap 14, bottom padding 28. `Screen` in `ui.tsx`.
- Card radius 16 (`theme.radius`), padding 16, gap 8, 1px border `#EEF0F3`. Small radius 12.
- Hero panels radius 20 to 22, padding 18. Pills and chips are fully rounded.
- Primary button height 52, radius 14. On the web the action is radius 16.
- Shadows stay soft and neutral: `rgba(16, 24, 40, 0.04)` on cards, and a 1px lift on the selected segment. The web action may use a soft teal shadow. Do not add a coloured glow anywhere else.

Group related lines tightly (8) and separate sections generously (14 to 16). Do not use one padding value for every edge.

## Motion

All of this is skipped when the person has asked to reduce motion (`useReducedMotion` reads `AccessibilityInfo`). The web page should respect `prefers-reduced-motion` the same way.

- `FadeIn`: opacity and a 10px rise, 420ms, ease out cubic, once.
- `ScoreRing`: one turn to the score, 1000ms, delay 120ms. Two clipped half rings, no SVG, so the app stays free of new native modules.
- Dose `Meter`: width grows once, 800ms, delay 200ms.
- The public page draws the ring in 1.1s and grows meters in 0.9s, with a cubic ease out.

No bounce, no elastic, no loop, no pulsing dot, no marquee. Pressed buttons drop to opacity 0.88. Disabled is 0.45.

## Adding pop without breaking the rules

The sharing screens do it like this. Copy the pattern instead of decorating.

- One hero, then quiet content. The score panel is the loudest thing on the page: a solid teal or slate field, the number, and the reasons with small dots (over, near, within the limit). A single darker disc sits behind it (`heroGlow`), same hue, clipped by the panel.
- The result hero is the teal wash, not a second saturated panel. One big value, then the window and the device in muted text.
- Daily doses are a meter or a composition strip, not a paragraph of numbers.
- The share cards mirror the images people post. Both are white, with a 4px teal line on the top edge, the mark, the name, the dose bars, and a score panel. The wide card is the link preview (1200 by 630). The tall card is the story (1080 by 1920, 9:16). That top line belongs to these cards only. Do not put a coloured side stripe on ordinary cards.
- A personal result the owner published sits on the card and the public page as a big number, with the window, the device, and "1 person, not a trial". Cohort averages stay off the page and both images. The preview cache key includes a renderer version in `server/src/og.ts`, so a drawing change generates a new image.
- The score panel may blend teal into `#0A5C50`, or slate into `#1D2939`. That is the only gradient. No gradient text, no rainbow, no background halo.

## Where the same pieces show up

- Audit leads with `ScoreHero`, then the amber savings block, then `DoseMeters`. The dose score is the same `scoreProducts` helper the share screen uses. Price is not an input.
- My Stack keeps the monthly spend as the largest number. A `ScoreBadge` sits under it and opens Audit. Discover and Share stack are text links in the header, at least 44 points tall. The only add control is the Add supplement bar, including when the stack is empty.
- Impact leads with deep sleep on `tealSoft`. The other two metrics sit beside each other. The chart bars are taller, and the tag controls are full chip height.
- The monthly report is titled "Monthly report" with a Pro pill on the same row. Overlap dollars sit on the amber block. That savings score is the Pro dollar figure, not the dose score, so it does not use the teal ring.
- Onboarding choices that are a sentence stay full-width rows, with a check when selected and a `tealSoft` fill. Age and sex are short, so they use `Chip`. The result step shows `ScoreHero` once there is a product.
- Selected plans, wearable cards, and choice rows use `theme.tealSoft`, not a one-off pale hex.
- Empty audit and impact screens use `EmptyLead`: a teal bubble, one sentence of what is missing, and a link back to My Stack. They do not add a second add button.
- Sign in and the save step label their fields. Buttons use a minimum height of 52 so larger text can grow.
- The numeral inside `ScoreRing` and `ScoreBadge` does not scale, because it is sized to the shape. Every other label does.
