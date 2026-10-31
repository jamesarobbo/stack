import { joinMoney } from '../../../shared/money';
import { auditStack } from '../domain/audit';
import type { ProductInput } from '../domain/types';
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
  const priced = audit.money.filter((line) => line.monthlyCents > 0);
  const currency = priced.length === 1 ? priced[0]!.currency : 'USD';
  const monthly = priced.length === 1 ? priced[0]!.monthlyCents : audit.monthlySpendCents;
  const wastedJoined = joinMoney(audit.money.map((line) => ({ currency: line.currency, cents: line.wastedCents })));
  return {
    empty,
    clean,
    goalLine: goalEcho(goals),
    because: becauseLine(goals),
    spendLine: spendLine(spend, monthly, currency),
    wearableLine: wearableLine(wearable),
    monthlySpendCents: audit.monthlySpendCents,
    wastedCents: audit.wastedCents,
    wastedLabel: wastedJoined ? `${wastedJoined} a month` : null,
    duplicateLabels: audit.duplicates.map((finding) => finding.label),
    duplicateDetail: audit.duplicates.map((finding) => `${finding.label}: ${finding.detail}`),
    limitLines: audit.limits.map((finding) => finding.message),
    headline: empty ? 'Nothing to audit yet' : clean ? 'No overlap in this stack' : 'Here is the audit',
  };
}
