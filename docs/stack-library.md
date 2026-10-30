# Stack library

Discover lists shared stacks that the owner has opted in. A link-only share is the default. It stays out of Discover and the public page stays `noindex`. Listing and indexing use the same switch: List in Discover. Unlisting hides the stack from Discover. Other people's saves are kept and come back if it is listed again.

A stack with any ingredient above twice its upper limit, or a product name with a disease word, is not listed.

## Segments

One control with four segments.

- New: listed stacks by the day they were first shared, newest first.
- Most kept: ranked by kept copies from the last 30 days. A kept copy is one whose products were still in the copier's stack 7 days later, from an account at least a day old, of the current formulation. The creator's own copies do not count. Counts below 3 are not shown anywhere.
- People like you: ranked by how many people in the viewer's sex and age group kept the stack, with at least 3. Needs sign-in and an age range and sex. It never ranks by results. A card can show the group result line when that group passes the rules in `docs/personal-outcome.md`.
- Saved: the signed-in person's bookmarks that are still listed.

Counts are recomputed once a day by the Worker's scheduled task.

## Search

Search runs in D1 with FTS5 over the stack name, the creator's display name, the goal tags, and the ingredient names and keys. A query that starts with "has", such as "has zinc magnesium", searches ingredients only, for every term. The app waits 300 ms after typing before it searches. Results load 20 at a time.

Goal tags are sleep, energy, heart health, recovery, focus, and longevity. The sharer picks up to 3.

## Moderation

Stack names, display names, and product names are checked for links, contact details, and disease words such as cure, treat, prevent, cancer, and diabetes. People can report a stack (health claim, unsafe dose, spam or advertising, pretending to be someone else, something else). After 3 different people report it, it is hidden from the page and Discover until reviewed. An admin queue (`GET /v1/admin/reports`, `POST /v1/admin/shares/:slug`) restores, hides, or removes it. People can block a creator, which hides that creator's stacks from them, and clear blocks in Settings.

Prices are not stored on the share and are not returned by Discover.
