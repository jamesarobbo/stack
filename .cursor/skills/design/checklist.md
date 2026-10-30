# Design review checklist

Use this at the end of a pass, on the before and after screenshots, not as a list of new features to invent.

The shape of the list follows Impeccable, the design vocabulary by Paul Bakaus (https://impeccable.style, source https://github.com/pbakaus/impeccable, Apache-2.0). This is a short adaptation for Stack. It is not the upstream skill. Where Impeccable and the hard rules in `SKILL.md` disagree, the hard rules win. In particular: Nunito stays, the cream Kitchen palette stays, and a poster panel may use the one-hue blend described in `language.md`.

## Must fix

- The screen has one job and one primary action. Anything else is quieter or one step away.
- A person can tell what matters with the page blurred. Title, then the number or the choice, then support.
- Body text is at least 4.5:1 on the surface it sits on, including cream. Large text (24px, or 19px bold) is at least 3:1. White on `theme.teal` and on `tint.slate` already clears this. Gold text on cream and on `amberBg` clears it. `theme.faint` does not, so it cannot carry a sentence. Do not set dark text on clay `#C46A45` or on the gold fill `#8A5A12`: both fail 4.5:1. Clay is illustration. Gold copy sits on the wash.
- Type scale has a clear jump between title, body, and meta. Do not set three sizes within 2px of each other and call it hierarchy.
- Spacing is even inside a group and larger between groups. Align to the 20px screen inset.
- Controls are at least 44 points, with a visible pressed state. Inputs have labels. Errors say what to do.
- Interactive views have an accessibility role and a label. Icon-only actions include a text label, as `IconAction` does.
- Motion has a reduced-motion path that still shows the final state. Nothing flashes. Nothing loops.
- Copy is sentence case, specific, and free of emoji, dashes, urgency, and health claims. A personal result names the window and the device and says it is one person.
- Empty states say what is missing and where to go. They use the shared bottle drawing. They do not add a second add button.
- The score reads as "72 out of 100" with the reasons beside it. Under 80 it is charcoal, not green.

## Should fix

- Cards only where the group is one object (a product, a step, a public summary). Nested cards, and a card around every paragraph, add noise. Use type and space instead.
- Do not repeat the same icon-in-a-rounded-square above every heading. Product rows and empty states use the shared bottles. That is enough.
- Do not put a thick coloured bar on the side of a card. The 4px top line on the share card preview is the exception, and it does not spread.
- Decorative gradients, gradient text, glass, and coloured glows are out. So are bounce easing, a pulsing status dot, a fake caret, and an auto-scrolling strip.
- A cool grey canvas, a purple gradient, and a dark theme are out. They fight Kitchen. A filled green or charcoal score panel is allowed on the posted images only.
- Numbers that animate count once, to the real value. Do not animate a number the person did not earn.
- The layout still works when text is larger. Prefer min height to a fixed height on anything that contains a label. Check a long stack name and a long product name.
- The public page has a real title and description and a readable preview image. Cohort averages stay off the page and both preview images. A personal result the owner published may show, with the window, the device, and that it is one person.

## Leave alone

- Do not redesign a screen that already follows this skill. Match the nearest reference surface.
- Do not add a page title to a tab, a house icon, an eyebrow, or an add control off My Stack.
- Do not show a kept count under 3, and do not rank stacks by health numbers.
- Do not put the audit score on a price, and do not colour savings with green. Gold is the money colour.
