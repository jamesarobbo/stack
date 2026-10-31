# Stack library

Discover is a main tab. It lists shared stacks that the owner has opted in. A link-only share is the default. It stays out of Discover and the public page stays `noindex`. Listing and indexing use the same switch: List in Discover. Unlisting hides the stack from Discover. Other people's saves are kept and come back if it is listed again.

A stack with any ingredient above twice its upper limit, or a product name with a disease word, is not listed.

## Segments

One control with four segments. Discover opens on Top.

- Top: the default rank. Score is `(8 * copies + ln(1 + views)) / (1 + ageDays / 21)`. `copies` is the distinct accounts that copied, other than the sharer, one per account. `views` is the number of share page and stack detail opens, one per viewer per UTC day. `ageDays` is how long ago the share was created. A copy is worth more than a large pile of views, and a newer stack is not buried by an older one with the same engagement. Price is not stored on a share and is not in the score. Wearable results and copier averages are not in the score. Counts below 3 are not shown on the card. The words are "Copied by 24 people".
- New: listed stacks by the day they were first shared, newest first.
- People like you: ranked by how many people in the viewer's sex and age group copied the stack, with at least 3. Needs sign-in and an age range and sex. The empty note is "No listed stack has been copied by 3 people like you yet." It never ranks by results. A card can show the group result line when that group passes the rules in `docs/personal-outcome.md`.
- Saved: the signed-in person's bookmarks that are still listed.

The copy count is written when someone copies, and recomputed once a day. The stored columns are still named kept_count and kept_recent. kept_count is the copy count above. kept_recent is copies from the last 30 days and is not the Top rank.

## Views

`share_views` stores one row per share, viewer, and UTC day (`server/migrations/0007_share_views.sql`). A signed-in open of the stack detail uses `user:<id>`. The public page uses `ip:<hash>` of the address, so the raw address is not stored. The same viewer on the same day does not count twice. The sharer's own account is not counted on the in-app detail. The public page cannot tell the owner apart, so that open can count. Bots, link-preview fetchers, and requests with no user agent are not counted. The preview images (`og.png`, `story.png`) are not views.

## Later

Linked copies, where a copied stack stays tied to the original, and notifications when a shared stack changes, are not built. Both wait until after launch.

## Search

Search runs in D1 with FTS5 over the stack name, the creator's display name, the goal tags, and the ingredient names and keys. A query that starts with "has", such as "has zinc magnesium", searches ingredients only, for every term. The app waits 300 ms after typing before it searches. Results load 20 at a time.

Goal tags are sleep, energy, heart health, recovery, focus, and longevity. The sharer picks up to 3. On the share screen, up to 3 can be suggested from the product and ingredient names (`shared/goalSuggestions.ts`). The line is "Suggested from your products". The sharer can clear or change them before listing. A stack that is already listed with no goals is left blank. The server does not fill tags in. Listing still waits until the sharer chooses List in Discover.

## Moderation

Stack names, display names, and product names are checked for links, contact details, and disease words such as cure, treat, prevent, cancer, and diabetes. People can report a stack (health claim, unsafe dose, spam or advertising, pretending to be someone else, something else). After 3 different people report it, it is hidden from the page and Discover until reviewed. An admin queue (`GET /v1/admin/reports`, `POST /v1/admin/shares/:slug`) restores, hides, or removes it. People can block a creator, which hides that creator's stacks from them, and clear blocks in Settings.

Prices are not stored on the share and are not returned by Discover.
