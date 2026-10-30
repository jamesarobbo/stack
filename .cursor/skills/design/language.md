# Visual language

Read this before drawing a new screen. Values below are the ones in the code. If a token and this file disagree, the token wins, then fix this file.

Kitchen is the live look: a cream ground, deep green for action, clay inside drawings, gold for money, Nunito, and warm charcoal when a score is under 80.

## Colour

Tokens live in `app/src/theme.ts`. The public page repeats them as CSS variables in `server/src/sharePage.ts`. The preview image repeats them in `server/src/og.ts`. Sharing tints that are not in `theme` live in `tint` in `app/src/components/share.tsx`.

Contrast below is on the cream canvas `#F6F0E6` unless another surface is named. A sentence needs 4.5:1. Large text (24px, or 19px bold) needs 3:1.

| Role | Token | Hex | Use |
|---|---|---|---|
| Canvas | `theme.bg` | `#F6F0E6` | App screen background. The public page column and both preview images use the same cream. The area outside the phone column is `#E4D5C4`. |
| Card | `theme.card` | `#FFFDF9` | Cards, product rows, the score hero. Ink on it is 14.7:1. |
| Ink | `theme.text` | `#2C261F` | Body and titles. 13.2:1 on cream. |
| Secondary | `theme.muted` | `#5E5348` | Help text. 6.6:1 on cream, 7.4:1 on a card. This is the quietest text that may carry a sentence. |
| Faint | `theme.faint` | `#B3A79A` | Inactive chrome only. It fails 4.5:1, so it cannot carry a sentence. Tab labels use `theme.muted`. |
| Line | `theme.line` | `#EADFD0` | Hairlines, card borders, meter tracks. |
| Green | `theme.teal` | `#2F5D4C` | Primary buttons, links, selected chips, a score of 80 or more. White on this green is 7.5:1. The token name stays `teal` so existing call sites pick up the green. |
| Green pressed | `theme.tealDark` | `#245041` | Pressed green. White on it is 9.1:1. |
| Green wash | `theme.tealSoft` | `#E5F0EA` | Result hero, selected row. Green text on it clears 4.5:1. |
| Charcoal | `tint.slate` | `#4A433C` | Scores under 80, so a low score never looks like a success. White on charcoal is 9.7:1. |
| Charcoal deep | `tint.slateDeep` | `#2C261F` | The far end of a low-score poster panel. |
| Gold | `theme.amber` | `#8A5A12` | Savings and prices only. 5.2:1 on cream, 5.2:1 on `amberBg` `#F8EFD8`. |
| Clay | `theme.clay` | `#C46A45` | Illustration fills and strokes only. Ink on clay is 3.9:1 and white on clay is 3.8:1, so no text sits on it. `theme.claySoft` `#F8E4D8` can hold ink (12.2:1). |
| Flag | `theme.flagText` | `#B42318` | A dose over the upper limit. 5.8:1 on cream and on `flagBg`. |
| Near | `tint.nearBar` | `#C4922A` | The meter fill from 90 percent of the limit. A fill, not a text colour. |

`scoreTone` in `app/src/components/share.tsx` and `server/src/og.ts` returns green from 80 and charcoal below. Use it. Do not colour a score with gold, clay, or any other hue.

Do not put ink or white on the saturated clay, and do not put ink on the gold fill (2.5:1). Gold copy sits on cream or on the gold wash. Clay stays inside `illustrations.tsx` and the matching drawings on the public page and the preview images.

## Type

Nunito, loaded in `app/app/_layout.tsx` with `expo-font` as `font.regular`, `font.medium`, `font.semibold`, `font.bold`. The public page loads the same family. The preview images bundle Nunito Medium and Bold (`server/assets/Nunito-OFL.txt`). One family is a choice: weight and size carry the hierarchy. Do not add a display serif, and do not swap the family.

`T` in `ui.tsx` sets `lineHeight` to 1.35 times the size. Default size is 16.

| Step | Size | Weight | Where |
|---|---|---|---|
| Page title | 34 web, about 28 to 34 in the app | bold | One per screen. Tracking about -0.8. |
| Section | 17 to 18 | semibold or bold | A group heading, sentence case. |
| Body | 16 | regular | |
| Button | 16 | semibold | |
| Secondary | 13 to 14 | regular or medium | `theme.muted` |
| Meta | 12 to 13 | semibold | Pills and reasons. Never all caps. |
| Score numeral | ring size times 0.36, or 44 on the web | bold | Tracking about -1.5. "out of 100" sits with it, smaller. |

Big numbers get tight tracking. Body text does not. Buttons are sentence case: "Copy to my stack", not "COPY".

## Space, radius, shadow

- Screen inset 20, content gap 14, bottom padding 28. `Screen` in `ui.tsx`.
- Card radius 22 (`theme.radius`), padding 16, gap 8, 1px warm border. Small radius 16.
- The in-app score hero is a warm card with a ring, radius 22, padding 18. Pills and chips are fully rounded.
- Primary button min height 52, radius 18.
- Shadows stay soft and warm: `rgba(80, 50, 30, 0.06)` on cards. Do not add a coloured glow.

Group related lines tightly (8) and separate sections generously (14 to 16). Do not use one padding value for every edge.

## Motion

All of this is skipped when the person has asked to reduce motion (`useReducedMotion` reads `AccessibilityInfo`). The web page should respect `prefers-reduced-motion` the same way.

- `FadeIn`: opacity and a 10px rise, 420ms, ease out cubic, once.
- `ScoreRing`: one turn to the score, 1000ms, delay 120ms. Two clipped half rings, no SVG native module, so an over-the-air update can ship it.
- Dose `Meter`: width grows once, 800ms, delay 200ms.
- The public page draws the ring in 1.1s and grows meters in 0.9s, with a cubic ease out.

No bounce, no elastic, no loop, no pulsing dot, no marquee. Pressed buttons drop to opacity 0.88. Disabled is 0.45.

## Illustrations

`app/src/components/illustrations.tsx` is the set: `WindowArt` (welcome), `BottleShelf` (My Stack), `EmptyBottles` (empty audit, impact, and an empty stack), `BottleBanner` (Discover cards), `BottleRow` (a short row for the paywall and a duplicate on Audit). The public page and `server/src/og.ts` draw the same three bottles (green, clay, cream with a gold cap). Clay never carries a label.

## Adding pop without breaking the rules

- One hero, then quiet content. In the app and on the public page the score is a ring on a warm card: green from 80, charcoal below, the number in ink, and the reasons in the same card. A low score is never green.
- Posted images (the share card, the 1200 by 630 preview, the 1080 by 1920 story) keep a filled panel in the same green or charcoal so the number stays readable small. The field around that panel is cream. White on both panel colours clears 4.5:1. The renderer version in `server/src/og.ts` is part of the cache key, so a drawing change generates a new image.
- The result hero is the green wash, not a second saturated panel. One big value, then the window and the device in muted text.
- Daily doses are a meter or a composition strip, not a paragraph of numbers.
- The share cards mirror the images people post. Both sit on cream, with a 4px green line on the top edge, the mark, the name, the dose bars, and a score panel. The wide card is the link preview. The tall card is the story (9:16). That top line belongs to these cards only.
- A personal result the owner published sits on the card and the public page as a big number, with the window, the device, and "1 person, not a trial". Cohort averages stay off the page and both images.
- A poster panel may blend green into `#245041`, or charcoal into `#2C261F`. That is the only gradient. No gradient text, no rainbow, no background halo.

## Where the same pieces show up

- Onboarding opens on the welcome screen: the window illustration, "Set the bottles on the table.", and Continue. Progress reads 1 of 10 there, then the goal, spend, wearable, about you, supplements, loader, result, save, and paywall.
- Audit leads with `ScoreHero`, then the gold savings block, then `DoseMeters`. The dose score is the same `scoreProducts` helper the share screen uses. Price is not an input.
- My Stack opens with the shelf, then the monthly spend as the largest number. Prices on each row are gold. A `ScoreBadge` sits under the spend and opens Audit. Share stack is a text link in the header when there are products, at least 44 points tall. The only add control is the Add supplement bar, including when the stack is empty.
- Discover is the second tab (`compass-outline`). It has no page title. Search, the New, Most kept, Like you, and Saved segments, and the goal chips sit above poster cards (`BottleBanner`, `ScoreBadge`, `CompositionStrip`). Empty uses `EmptyLead`. When fewer than 3 stacks are listed and nothing is filtered, one quiet line says that is the whole list. Kept counts stay hidden under 3. Audit links here only when the dose audit has a gap (a duplicate, a limit flag, or a score under 80). The last onboarding step can open it after Continue with Free.
- Impact leads with deep sleep on `tealSoft`. The other two metrics sit beside each other. The chart bars are taller, and the tag controls are full chip height.
- The monthly report is titled "Monthly report" with a Pro pill on the same row. Overlap dollars sit on the gold block. That savings score is the Pro dollar figure, not the dose score, so it does not use the green ring.
- Onboarding choices that are a sentence stay full-width rows, with a check when selected and a green wash. Age and sex are short, so they use `Chip`. The result step shows `ScoreHero` once there is a product.
- Selected plans, wearable cards, and choice rows use `theme.tealSoft`, not a one-off pale hex.
- Empty audit and impact screens use `EmptyLead`: the empty-bottle drawing, one sentence of what is missing, and a link back to My Stack. They do not add a second add button.
- Sign in and the save step label their fields. Buttons use a minimum height of 52 so larger text can grow.
- The numeral inside `ScoreRing` and `ScoreBadge` does not scale, because it is sized to the shape. Every other label does.
