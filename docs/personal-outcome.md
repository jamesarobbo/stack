# Personal outcome and copier aggregate

A personal result is optional. The person sharing a stack can attach one headline, or none.

## Eligibility

The stack start date is the earliest product start date.

Before the start date, the baseline is the mean of daily values in the 90 days immediately before that date. At least 60 of those days must have a value.

After the start date, the comparison window is the first 90 days from the start date. It becomes eligible once 60 calendar days have elapsed and at least 21 of the days in that window have a value. The headline says how many days that window covers (60 to 90).

Relative change is (after mean minus before mean) divided by the before mean. The before mean must be above zero. The percent is rounded to the nearest whole number. Down, up, or about the same is a description of that number. It is not a claim that a supplement caused it.

The headline names the metric, the percent, the window, and the device. The screen always adds "1 person, not a trial" and the label "What changed for me".

Raw samples are sent only so the server can compute the headline. They are not stored, and they are not part of the shared snapshot.

Example data and a build without Apple Health (including Expo Go) do not invent a result. The screen says there is not enough data.

## Copier aggregate

A copier can submit the same kind of summary after they copy a stack. The server stores the percent, metric, window length, device, age range, and sex. It does not store the day by day samples.

The average is shown only when at least 10 copied users have an eligible result for the same metric, each with a window of at least 90 days. Shorter windows stay out of the average so a menstrual cycle is less likely to dominate the number.

The line names the cohort mix, for example "mostly men 30 to 39", when one age and sex group is at least 40 percent of those people. Otherwise it says the group is mixed.

A "people like you" filter uses the viewer's age range and sex. That slice is shown only when it also has at least 10 people. Fewer than 10 is reported as not enough, without the count.

Stacks are not ranked against each other by these numbers.

The public wording is "Real-world data, not a trial."
