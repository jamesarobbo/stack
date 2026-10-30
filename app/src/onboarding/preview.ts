import { auditStack } from '../domain/audit';
import type { ProductInput } from '../domain/types';
import { formatUsd } from '../format';
import { becauseLine, goalEcho, spendLine, wearableLine } from './answers';

export const AUDIT_CHECKS = [
  'Duplicate ingredients',
  'Overlapping products',
  'Doses above common upper limits',
  'Spend',
] as const;

export function buildOnboardingPreview(products: ProductInput[], goals: readonly string[], spend: string | null, wearable: string | null) {
  const audit = auditStack(products);
  const empty = products.length === 0;
  const clean = !empty && audit.duplicates.length === 0 && audit.limits.length === 0 && audit.wastedCents === 0;
  return {
    empty,
    clean,
    goalLine: goalEcho(goals),
    because: becauseLine(goals),
    spendLine: spendLine(spend, audit.monthlySpendCents),
    wearableLine: wearableLine(wearable),
    monthlySpendCents: audit.monthlySpendCents,
    wastedCents: audit.wastedCents,
    wastedLabel: audit.wastedCents > 0 ? `${formatUsd(audit.wastedCents)} a month` : null,
    duplicateLabels: audit.duplicates.map((finding) => finding.label),
    duplicateDetail: audit.duplicates.map((finding) => `${finding.label}: ${finding.detail}`),
    limitLines: audit.limits.map((finding) => finding.message),
    headline: empty ? 'Nothing to audit yet' : clean ? 'No overlap in this stack' : 'Here is the audit',
  };
}
