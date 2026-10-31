export const DISCOVER_LABEL = 'Discover';
export const DISCOVER_TAB_HREF = '/(tabs)/discover';
export const DISCOVER_LEAD = 'Stacks people chose to list, with their doses checked. Link-only shares never appear here.';
export const DISCOVER_EMPTY_TITLE = 'No listed stacks yet';
export const DISCOVER_EMPTY_BODY = 'When someone lists a stack, it shows up here. A link-only share stays off this list.';
export const DISCOVER_SPARSE = 'This is every listed stack right now.';
export const BROWSE_LISTED = 'Browse listed stacks';

export const LIBRARY_GOALS = [
  { key: 'sleep', label: 'Sleep' },
  { key: 'energy', label: 'Energy' },
  { key: 'heart', label: 'Heart health' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'focus', label: 'Focus' },
  { key: 'longevity', label: 'Longevity' },
] as const;

export type LibraryGoalKey = (typeof LIBRARY_GOALS)[number]['key'];

export const LIBRARY_SEGMENTS = [
  { key: 'top', label: 'Top' },
  { key: 'new', label: 'New' },
  { key: 'like_you', label: 'Like you' },
  { key: 'saved', label: 'Saved' },
] as const;

export type LibrarySegmentKey = (typeof LIBRARY_SEGMENTS)[number]['key'];

export const SEGMENT_NOTES: Record<LibrarySegmentKey, string> = {
  new: 'Newest listed stacks first.',
  top: 'Copies count the most. Page views add a smaller amount, and newer stacks are not buried. Price and wearable results are not used.',
  like_you: 'Ranked by how many people in your age group and sex copied the stack. Not ranked by results.',
  saved: 'Stacks you saved. Only you can see this list.',
};

export const REPORT_REASONS = [
  { key: 'health_claim', label: 'Health claim, like a cure or treatment' },
  { key: 'unsafe_dose', label: 'Unsafe dose' },
  { key: 'spam', label: 'Spam or advertising' },
  { key: 'impersonation', label: 'Pretending to be someone else' },
  { key: 'other', label: 'Something else' },
] as const;

export type ReportReasonKey = (typeof REPORT_REASONS)[number]['key'];

export function goalLabel(key: string): string {
  return LIBRARY_GOALS.find((goal) => goal.key === key)?.label ?? key;
}
