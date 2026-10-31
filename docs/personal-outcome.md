# Personal outcome and copier results

All results are worked out on the phone from Apple Health. No wearable samples leave the phone. The Worker receives only the derived headline fields (metric, direction, whole percent, within normal variation, window length, device type), checks them with `validateOutcomeFields` in `shared/outcome.ts`, and writes the sentence itself.

## Reading Apple Health

The app asks once, with a single permission sheet that also covers date of birth and biological sex. It reads 400 days of history with statistics queries, so steps from an iPhone and a Watch are not counted twice. Deep sleep keeps the source with the most deep sleep for each night instead of adding sources together. Apple Health is read again on launch at most every 12 hours, without a new permission sheet.

Date of birth and biological sex only suggest an age range and sex on the about you screen. They are stored on the phone and never sent to analytics.

## Measures

Resting heart rate, heart rate variability, and deep sleep. Steps, active energy, and VO2 max are not used for results: the first two are behaviour rather than outcome, and VO2 max is too sparse.

## Windows

The start is the earliest product start date for the person sharing, and the server's copy date for a copier.

- Before: the 84 days before the start, with at least 56 measured days.
- Settling in: the first 14 days after the start are skipped.
- After: days 15 to 98, with at least 42 measured days. A result is ready on day 98.

The change is the median of the after window against the median of the before window, as a whole percent. 84 days is 3 menstrual cycles on each side.

## Normal variation

The same change is measured at earlier pretend start dates, every 2 weeks, entirely inside the person's own history. A change smaller than the 80th percentile of those changes, or smaller than a floor (3 percent for resting heart rate, 8 for heart rate variability, 10 for deep sleep), reads as "stayed within normal variation". That is an honest result and can be shared. The Worker rejects a change outside normal variation that is below the floor, and any change above 60 percent.

## Sharing your own result

Optional. The share screen lists the results that are ready and a review step shows exactly what will be public before anything is published. Updating a share keeps the published result unless the person picks another one or removes it.

The result line ends with a star. In the app the star is plain text. About results is in More, and that page says a personal result is one person's wearable data compared with their own baseline over the stated window, and it is not proof the stack caused the change. The accessibility label speaks that caveat. The kicker is "What changed for @username", or "What changed for me" on the share screen. The public page keeps the note beside the result: "One person's wearable. Not proof it caused the change." The link preview and the story image keep a short footnote: "* 1 person, not a trial".

## Copier results

When copying, the person can agree to add their result to the stack's group. They can turn it off later on the stack page, which deletes what they sent. After day 98 from the copy date, the app sends the fields above for each measure that is ready, at most once a day. Results are tied to the version of the stack that was copied. A change of ingredients or doses starts a new group.

## Groups

Results are shown in the app only, to signed-in people, never on the web page. Groups are fixed: everyone, by sex, and by sex and age group (under 40, 40 to 59, 60 plus). There is no free filter.

A group is shown only with at least 10 people, and only when the people in its parent group who fall outside the shown groups are none or at least 10. That stops two groups being subtracted to reveal one person. The middle value is shown as a 5 point range and the head count as a range. Groups are recomputed once a day from results sent before that day began.

The wording is "Real-world data from people who copied this stack, not a trial". Each group line ends with a plain star. About results, in More, also says a group needs at least 10 people, how age and sex groups are chosen, and that groups are updated once a day. Stacks are not ranked by these numbers.
