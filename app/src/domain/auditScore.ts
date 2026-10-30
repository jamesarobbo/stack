/**
 * Dose-only audit score. See docs/audit-score.md.
 * The app previews with the same implementation the Worker uses to store the published score.
 * Price is not an input. The Pro savings figure is a separate dollar amount.
 */
export {
  SCORE_CAPS,
  SCORE_WEIGHTS,
  auditScore,
  scoreStack,
  summarise,
  type DailyTotal,
  type ScoreIngredient,
  type ScoreProduct,
  type ScoreReason,
  type ScoreReasonKind,
  type ScoreResult,
} from '../../../shared/auditScore';
