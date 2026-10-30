/**
 * Text filters and report handling for shared stacks. See docs/stack-library.md.
 * App Store guideline 1.2: filter objectionable text, let people report and block, and act on reports.
 */

export const REPORT_REASONS = ['health_claim', 'unsafe_dose', 'spam', 'impersonation', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Distinct reporters before a stack leaves Discover pending review. */
export const AUTO_HIDE_REPORTS = 3;

const DISEASE_WORDS = [
  'cure',
  'cures',
  'cured',
  'curing',
  'treat',
  'treats',
  'treatment',
  'treating',
  'prevent',
  'prevents',
  'prevention',
  'heal',
  'heals',
  'healing',
  'reverse',
  'reverses',
  'cancer',
  'tumor',
  'tumour',
  'diabetes',
  'diabetic',
  'alzheimer',
  'alzheimers',
  'dementia',
  'covid',
  'hiv',
  'arthritis',
  'hypertension',
  'depression',
  'adhd',
  'autism',
  'disease',
  'covid19',
  'proven',
  'clinically',
  'guaranteed',
  'miracle',
];

const URL_PATTERN = /(https?:\/\/|www\.)|\b[a-z0-9-]{2,}\.(com|net|org|io|co|app|shop|store|ly|me|uk|us|info|biz|xyz)\b/i;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const HANDLE_PATTERN = /(^|\s)@[a-z0-9_.]{2,}/i;
const PHONE_PATTERN = /(\+?\d[\s().-]?){7,}/;

export type TextProblem = 'link' | 'contact' | 'health_claim';

/** Problems with a stack name or display name. */
export function nameProblem(value: string): TextProblem | null {
  if (URL_PATTERN.test(value)) return 'link';
  if (EMAIL_PATTERN.test(value) || HANDLE_PATTERN.test(value) || PHONE_PATTERN.test(value)) return 'contact';
  if (hasDiseaseWord(value)) return 'health_claim';
  return null;
}

/** Product names come from labels, so only links and contact details are refused. Claims keep a stack out of Discover. */
export function productNameProblem(value: string): TextProblem | null {
  if (URL_PATTERN.test(value)) return 'link';
  if (EMAIL_PATTERN.test(value) || HANDLE_PATTERN.test(value)) return 'contact';
  return null;
}

export function hasDiseaseWord(value: string): boolean {
  const words = value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((word) => DISEASE_WORDS.includes(word));
}

export function problemMessage(problem: TextProblem, field: 'stack name' | 'name' | 'product name'): string {
  if (problem === 'link') return `Take the link out of the ${field}.`;
  if (problem === 'contact') return `Take the contact details out of the ${field}.`;
  return `The ${field} cannot make a health claim. Try describing the routine instead, for example "Evening magnesium".`;
}

export function isReportReason(value: unknown): value is ReportReason {
  return typeof value === 'string' && (REPORT_REASONS as readonly string[]).includes(value);
}
