# Visual language

Read this before drawing a new screen. Values below are the ones in the code. If a token and this file disagree, the token wins, then fix this file.

Apple minimal is the live look. Light and dark follow the phone (`useTheme` in `app/src/theme.ts`). The system font carries the type. Gold is money. A score under 80 is a neutral ring, never green.

Colours are read at render time. `StyleSheet.create` at module load will not switch with the phone.

## Colour

`theme.action` is the filled button in both modes (`#0066CC`, white text 5.57:1). `theme.teal` is the link and icon accent: `#0066CC` in light, `#64B5FF` in dark (7.77:1 on a card). Do not fill a button with the dark link blue. White on it fails.

The mark stays `#0E7A45` with white bars in both modes (white on that green is 5.40:1).

| Role | Light | Dark | Use |
|---|---|---|---|
| Canvas | `#F2F2F7` | `#000000` | Screen background. Posted images and the public page use the light canvas. |
| Card | `#FFFFFF` | `#1C1C1E` | Groups. Ink on white is 17.0:1. White on the dark card is 17.0:1. |
| Ink | `#1C1C1E` | `#FFFFFF` | Body and titles. |
| Secondary | `#636366` | `#AEAEB2` | Help text and placeholders. 5.99:1 on white, 7.69:1 on the dark card. This is the quietest text that may carry a sentence. |
| Line | `#C6C6C8` | `#38383A` | Hairlines and borders. |
| Good | `#1F7A34` | `#30D158` | A score of 80 or more, and a recovery chip. White on `#1F7A34` is 5.40:1, so a good badge can use that fill in both modes. |
| Score ring | `#3A3A3C` | `#EBEBF5` | Under 80. The number stays ink, not white on a slab. |
| Near | `#D70040` | `#FF375F` | A dose from 90 percent of the limit. Not gold. |
| Gold | `#8A5600` | `#F5C14A` | Prices and savings only. Light gold sits on `#FFF4D4` (5.61:1). Dark gold sits on the card (10.22:1). No pale gold wash on black. |
| Sleep | `#5856D6` | `#A29BFE` | Sleep data and sleep chips. |
| Heart rate | `#0A7A8C` | `#5AC8FA` | HRV and energy chips. |
| Heart | `#D70040` | `#FF375F` | Heart data. |

Chip text on its wash clears 4.5:1 in both modes. The pairs live on `theme.chips`. Longevity names use the neutral chip. Do not invent a hue for them.

`#8E8E93` fails as body text on white. Do not use it for a sentence.

## Type

The system font. `font.regular` through `font.bold` are weights `400`, `500`, `600`, and `700`. `T` sets `fontWeight` and does not set `fontFamily`. The public page uses the system stack, with Inter as a fallback. Preview images bundle Inter Medium and Bold (`server/assets/Inter-OFL.txt`).

`T` sets `lineHeight` to 1.35 times the size. Default size is 16.

| Step | Size | Weight | Where |
|---|---|---|---|
| Page title | 34 web, about 28 to 34 in the app | bold | One per screen. Tracking about -0.8. Tab screens have no page title. |
| Section | 17 to 18 | semibold or bold | A group heading, sentence case. |
| Body | 16 | regular | |
| Button | 16 | semibold | |
| Secondary | 13 to 14 | regular or medium | `theme.muted` |
| Meta | 12 to 13 | semibold | Pills and reasons. Never all caps. |
| Score numeral | ring size times 0.36, or 44 on the web | bold | Tracking about -1.5. "out of 100" sits with it, smaller. |

## Space, radius, shadow

- Screen inset 20, content gap 14, bottom padding 28.
- Card radius 12 (`theme.radius`). Button radius 14. Pills fully rounded.
- The score hero is a white or dark card with a ring. The number is ink. No filled charcoal slab, and no thick green bar on the card.
- Product rows sit in one group with hairline separators, not a card per row.
- My Stack puts the share icon at the top right once the stack has products. Hit target 44. The label is "Share stack". Android uses the share-social outline. It is not an add control.

## Motion

Skipped when the person has asked to reduce motion. The web page respects `prefers-reduced-motion`.

- `FadeIn`: opacity and a 10px rise, 420ms, ease out cubic, once.
- `ScoreRing`: one turn to the score, 1000ms, delay 120ms. Two clipped half rings, no SVG native module.
- Dose `Meter`: width grows once, 800ms, delay 200ms.

No bounce, no loop, no pulsing dot. Pressed buttons drop to opacity 0.88. Disabled is 0.45.

## Discover cards

Name, then up to four short product chips and "+N more" if needed, then the dose score ring, then a published result with the real 12 week window, then a copy icon from 3 copies and an eye icon from 10 views. The number is short (25, 1.2k). The accessibility label is the full count ("25 copies", "1,200 views"). The sharer is `@username`. With no username yet, the line is "A Stack user". A flat result says it showed no clear change. A personal or group result line ends with a star. The star is plain text. About results, in More, explains it. The accessibility label speaks the caveat. The personal caveat stays "One person's wearable. Not proof it caused the change." The group caveat stays "Real-world data from people who copied this stack, not a trial." The public page and the share images keep a short footnote, because a viewer outside the app has no About results screen. Do not paint a small change green.

## Native config

`userInterfaceStyle: 'automatic'`, the splash background `#F2F2F7`, and the Android adaptive icon background `#F2F2F7` are native. A shipped binary keeps the old values until a new build. Over the air, dark mode follows the system only where the binary already reports it (web, Expo Go, or a build that includes this config).
