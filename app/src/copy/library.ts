export const DISCOVER_LABEL = 'Discover';

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
  { key: 'new', label: 'New' },
  { key: 'top', label: 'Most kept' },
  { key: 'like_you', label: 'People like you' },
  { key: 'saved', label: 'Saved' },
] as const;

export type LibrarySegmentKey = (typeof LIBRARY_SEGMENTS)[number]['key'];

export const SEGMENT_NOTES: Record<LibrarySegmentKey, string> = {
  new: 'Newest listed stacks first.',
  top: 'Ranked by people who still had the products in their stack 7 days after copying, over the last 30 days.',
  like_you: 'Ranked by how many people in your age group and sex kept the stack. Not ranked by results.',
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
