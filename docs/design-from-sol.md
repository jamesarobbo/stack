# Design notes from Spanish Out Loud

Read only reference: local clone at `/workspace/sol-design-ref` (jamesarobbo/spanishoutloud). Not modified.

## What SOL does well

- **Tokens first.** One theme module owns `colors`, `space` (xs to xxxl), `radius`, `type`, and flat `shadow` (hairline borders, no drop shadows). Screens rarely invent spacing.
- **Type scale.** Named roles (`hero`, `title`, `heading`, `body`, `bodySmall`, `label`, `caption`) instead of one off sizes on every screen.
- **Group and Row.** Settings style lists: a bordered group of rows with title, optional subtitle, value, and chevron. Matches iOS Settings.
- **Native controls where it counts.** `Switch` for booleans. Short choice sets use a segmented control. Text fields set `keyboardType`, `textContentType`, `autoComplete`, and `returnKeyType`.
- **Quiet cards.** Surface fill, 1px border, generous padding, no emoji, sentence case.
- **Press feedback.** Light scale on press (`PressableScale`) plus selection haptics. Not required for Stack, but it makes rows feel finished.

## Where Stack differed

- Theme had colors and radii, but no shared spacing scale, so cards and rows drifted.
- Unit and some selects were custom expanding menus instead of system pickers or action sheets.
- Segmented tabs (Discover, Add search/manual) were hand drawn Pressables.
- Product rows showed raw catalogue notes (`NIH DSLD … Serving size: …`) instead of a human subtitle.
- The Log today card was a title and an X with no status.

## What we took for Stack

Keep Stack's Apple Health rules: system appearance, filled action `#0066CC`, gold only for money, AA contrast, no emoji, no dashes in copy, sentence case.

Adopted from SOL:

1. A `space` scale on the Stack theme for shared padding and gaps.
2. Native selects (action sheet / dropdown picker) and native segmented control for short sets.
3. Stronger TextInput defaults (`clearButtonMode`, content types, return keys).
4. Group like list polish and human product row subtitles (brand and servings a day).
5. A clearer optional Log today card with status, a chevron tap target, and a quiet dismiss.

Not copied: SOL's Costa del Sol palette, custom display fonts, or sun yellow accents. Stack stays Apple Health minimal.
