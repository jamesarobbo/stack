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

export const LIBRARY_TABS = [
  { key: 'new', label: 'New' },
  { key: 'top', label: 'Top' },
  { key: 'saved', label: 'Saved' },
] as const;

export const LIBRARY_SORTS = [
  { key: 'newest', label: 'Newest' },
  { key: 'score', label: 'Audit score' },
  { key: 'copies', label: 'Copies' },
  { key: 'like_you', label: 'People like you' },
] as const;

export const REPORT_REASONS = ['The doses look wrong', 'This is not a supplement stack', 'Something else'] as const;
