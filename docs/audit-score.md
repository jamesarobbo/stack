# Audit score

The audit score is a number from 0 to 100, shown as "72 out of 100" with its reasons next to it. It describes daily doses and overlaps only. It does not use price, monthly spend, or the Pro savings score.

There is one implementation, `shared/auditScore.ts`. The Worker stores the published score with it and the app previews with the same file, so the two cannot drift. Upper limits and unit factors live in `shared/doses.ts`, and a test checks they match the in-app audit table.

A stack with nothing to flag scores 100. Scores from 80 are shown in teal. Lower scores are shown in slate, so a low score never looks like a success.

## Daily totals

Each ingredient's daily total is the label amount times servings per day, added across products and converted into the unit of the NIH Office of Dietary Supplements adult upper limit. Vitamin D converts at 1 mcg = 40 IU and vitamin E at 1 IU = 0.67 mg. Vitamin A in IU is not converted, because the limit covers preformed retinol and an IU amount can be beta-carotene. A dose in a unit that cannot be converted is listed as not checked and costs nothing.

Ingredients group by `family` when the label has one, so the score and the in-app audit agree about duplicates.

## Reasons and points

1. Above the upper limit: 20 points per ingredient, at most 40 in total.
2. Close to the upper limit (from 90 percent): 5 points per ingredient, at most 15.
3. Doubled up: an ingredient family with no upper limit in more than one product costs 8 points for each product beyond the first, at most 24.

An ingredient with an upper limit that appears in several products but stays within the limit in total is listed as "within the limit in total" and costs nothing. A multivitamin plus a single magnesium under the limit is not a problem. An ingredient that is already above or close to its limit is not also charged as doubled.

Score = 100 minus the three parts, clamped to 0 to 100.

A stack with any ingredient above twice its upper limit can still be shared by link, but it is not listed in Discover.

Prices are not an input. Two stacks with the same doses score the same if one of them has blank prices.
