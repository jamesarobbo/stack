/**
 * Small curated set of educational notes. A note is not a recommendation
 * to start, stop, or change a dose. Rules fire from ingredients in the stack.
 * They do not know what medicines a person takes.
 */
export type InteractionRule = {
  id: string;
  /** Every listed ingredient key must be in the stack. One key means the note is about that ingredient. */
  allOf: string[];
  message: string;
};

export const INTERACTION_RULES: InteractionRule[] = [
  {
    id: 'resveratrol-anticoagulants',
    allOf: ['resveratrol'],
    message:
      'Resveratrol + common blood thinners: published literature exists. Discuss with a clinician. Not a dosing recommendation.',
  },
  {
    id: 'omega-3-anticoagulants',
    allOf: ['omega-3'],
    message:
      'Omega-3 and anticoagulant medicines: published literature exists. Discuss with a clinician. Not a dosing recommendation.',
  },
  {
    id: 'berberine-glucose-medicines',
    allOf: ['berberine'],
    message:
      'Berberine and glucose-lowering medicines: published literature exists. Discuss with a clinician. Not a dosing recommendation.',
  },
  {
    id: 'vitamin-k-antagonists',
    allOf: ['vitamin-k'],
    message:
      'Vitamin K and vitamin K antagonist medicines (such as warfarin): published literature exists. Discuss with a clinician. Not a dosing recommendation.',
  },
  {
    id: 'calcium-iron-absorption',
    allOf: ['calcium', 'iron'],
    message:
      'Calcium and iron are both in this stack. Published literature describes lower iron absorption when they are taken at the same time. Not a dosing recommendation.',
  },
  {
    id: 'zinc-copper',
    allOf: ['zinc'],
    message:
      'Zinc taken for a long time without copper: published literature describes an effect on copper status. Discuss with a clinician. Not a dosing recommendation.',
  },
];
