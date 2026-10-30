export type IngredientInput = {
  key: string;
  name: string;
  amount: number;
  unit: string;
  /** Share of the product's monthly cost. Weights are relative, not milligrams. */
  costWeight: number;
  /** Short phrase used on the duplicate line. */
  summary?: string;
  family?: string;
  familyLabel?: string;
};

export type ProductInput = {
  id: string;
  name: string;
  brand: string | null;
  note: string | null;
  priceCents: number;
  servingsPerContainer: number;
  servingsPerDay: number;
  startDate: string;
  catalogueId?: string | null;
  ingredients: IngredientInput[];
};

export type HealthMetric =
  | 'deep_sleep_min'
  | 'hrv_sdnn_ms'
  | 'resting_hr_bpm'
  | 'vo2_max'
  | 'steps'
  | 'active_energy_kcal';

export type SampleInput = {
  metric: HealthMetric;
  date: string;
  value: number;
};

export type TagKind = 'alcohol' | 'travel' | 'hard_training';

export type TagInput = {
  date: string;
  kind: TagKind;
};

export type Verdict = 'keep' | 'drop' | 'unclear';
