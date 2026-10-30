# Audit score

The audit score is a number from 0 to 100. It describes dose overlap only. It does not use price, monthly spend, or the Pro savings score (that older number is overlap dollars divided by monthly spend).

A stack with nothing to flag scores 100. The score is clamped to 0 to 100 after the penalties below.

## What counts as an ingredient

An ingredient counts when its amount is a finite number above zero. The identity is the ingredient key, such as `magnesium` or `vitamin-d`. The product id distinguishes bottles. Servings per day scale the daily dose used for upper limits. They do not change whether an ingredient is present.

## Penalties

Each part is capped so one kind of issue cannot zero the score by itself.

1. Duplicate ingredients. For each key that appears in two or more products, add 12 points for every product beyond the first. Cap this part at 48.
2. Upper limits. Daily total is the label amount times servings per day, converted into the unit used by the NIH Office of Dietary Supplements adult upper limit (the same factors as the in-app audit). Above the upper limit costs 20 points for that key. At or above 90 percent of the upper limit, and not above it, costs 8 points. Keys with no published upper limit in that table are ignored. Cap this part at 40.
3. Redundant products. A product is redundant when it has at least one counted ingredient and every one of those keys also appears on another product. Each redundant product costs 15 points. Cap this part at 30.

Score = 100 minus those three parts, then clamped to 0 to 100.

Prices are not an input. Two stacks with the same doses and the same bottles score the same if one of them has blank prices.
