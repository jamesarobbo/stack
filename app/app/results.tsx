import { BackButton, Card, Screen, T } from '@/src/components/ui';
import { useTheme } from '@/src/theme';

export default function AboutResultsScreen() {
  const theme = useTheme();
  return (
    <Screen>
      <BackButton />
      <T weight="bold" size={32} style={{ letterSpacing: -0.6 }}>
        About results
      </T>
      <T size={15} color={theme.muted}>
        A star on a result line opens this page.
      </T>
      <Card>
        <T weight="semibold">One person</T>
        <T size={15} color={theme.muted}>
          {"One person's wearable. Not proof it caused the change."}
        </T>
        <T size={15} color={theme.muted}>
          {"A personal result compares that person's wearable data with their own baseline, over the window named on the line. The window is 12 weeks before against 12 weeks after, measured on their wearable."}
        </T>
      </Card>
      <Card>
        <T weight="semibold">People who copied it</T>
        <T size={15} color={theme.muted}>
          Real-world data from people who copied this stack, not a trial.
        </T>
        <T size={15} color={theme.muted}>
          Each person is compared with their own baseline over the same kind of window. A group is shown only with at least 10 people. The groups are everyone, women, men, and those groups split by age: under 40, 40 to 59, and 60 plus.
        </T>
        <T size={15} color={theme.muted}>
          Age and sex are what each person chose in the app. Prefer not to say still counts in everyone, and is left out of the sex and age groups. A smaller group stays hidden when some people, but fewer than 10, fall outside it, so two groups cannot be subtracted to reveal one person.
        </T>
        <T size={15} color={theme.muted}>
          The change and the number of people are ranges. Groups are updated once a day.
        </T>
      </Card>
    </Screen>
  );
}
