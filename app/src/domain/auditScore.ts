/**
 * Dose-only audit score. See docs/audit-score.md.
 * The app previews with the same implementation the Worker uses to store the published score.
 * Price is not an input. The Pro savings figure is a separate dollar amount.
 */
import { scoreStack as scoreStackOf, type ScoreResult } from '../../../shared/auditScore';
import type { ProductInput } from './types';

/** Same score the share screen previews. Price is not passed in. */
export function scoreProducts(products: ProductInput[]): ScoreResult {
  return scoreStackOf(
    products.map((product) => ({
      id: product.id,
      name: product.name,
      servingsPerDay: product.servingsPerDay,
      ingredients: product.ingredients.map((ingredient) => ({
        key: ingredient.key,
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        family: ingredient.family,
        familyLabel: ingredient.familyLabel,
      })),
    })),
  );
}

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
