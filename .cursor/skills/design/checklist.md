# Design review checklist

Use this at the end of a pass, on the before and after screenshots, not as a list of new features to invent.

The shape of the list follows Impeccable, the design vocabulary by Paul Bakaus (https://impeccable.style, source https://github.com/pbakaus/impeccable, Apache-2.0). This is a short adaptation for Stack. It is not the upstream skill. Where Impeccable and the hard rules in `SKILL.md` disagree, the hard rules win. In particular: the system font stays, light and dark follow `language.md`, and gold is only for money.

## Must fix

- The screen has one job and one primary action. Anything else is quieter or one step away.
- A person can tell what matters with the page blurred. Title, then the number or the choice, then support.
- Body text is at least 4.5:1 on the surface it sits on, in light and in dark. Large text (24px, or 19px bold) is at least 3:1. White on `#0066CC` clears this. `#64B5FF` is for text and icons on dark surfaces, not for a fill behind white. Gold text sits on the light wash or on the dark card. Do not set text on a gold fill.
- Type scale has a clear jump between title, body, and meta. Do not set three sizes within 2px of each other and call it hierarchy.
- Spacing is even inside a group and larger between groups. Align to the 20px screen inset.
- Controls are at least 44 points, with a visible pressed state. Inputs have labels. Errors say what to do.
- Interactive views have an accessibility role and a label. The share icon label is "Share stack".
- Motion has a reduced-motion path that still shows the final state. Nothing flashes. Nothing loops.
- Copy is sentence case, specific, and free of emoji, dashes, urgency, and health claims. A personal result names the 12 week window and says it is one person.
- Empty states say what is missing and where to go. They do not add a second add button, and they do not draw bottles.
- The score reads as a dose score out of 100, from doses and overlaps, not price. Under 80 the ring is neutral, not green.

## Should fix

- Cards only where the group is one object. A product list is one group with hairlines, not a card per row.
- Do not repeat the same icon-in-a-rounded-square above every heading.
- Do not put a thick coloured bar on the side or top of a card.
- Decorative gradients, gradient text, glass, and coloured glows are out. So are bounce easing, a pulsing status dot, and an auto-scrolling strip.
- Numbers that animate count once, to the real value.
- The layout still works when text is larger. Prefer min height to a fixed height on anything that contains a label.
- The public page has a real title and description and a readable preview image. Cohort averages stay off the page and both preview images. A personal result the owner published may show, with the window and that it is one person.
- Check the same screen in light and dark. `useColorScheme` on web follows `prefers-color-scheme`.

## Leave alone

- Do not redesign a screen that already follows this skill. Match the nearest reference surface.
- Do not add a page title to a tab, a house icon, an eyebrow, or an add control off My Stack.
- Do not show a copy count under 3, and do not rank stacks by price or by health numbers.
- Do not put the audit score on a price, and do not colour savings or a small wearable change with green. Gold is the money colour.
