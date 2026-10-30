/**
 * Adult upper limits published by the NIH Office of Dietary Supplements.
 * Used only as a soft flag. This is not a target, a dose, or personal advice.
 * Magnesium's UL applies to supplements, not magnesium from food.
 * Niacin's UL applies to nicotinic acid from supplements and fortified foods.
 * Vitamin A is preformed retinol, not beta-carotene.
 * Ages differ for a few nutrients; this table uses the adult figure cited on each fact sheet.
 */
export type UpperLimit = {
  key: string;
  name: string;
  unit: string;
  ul: number;
  /** Near flag starts at this fraction of the UL. At the UL counts as near; above it counts as over. */
  nearFrom: number;
  citation: string;
  sourceUrl: string;
};

export const UPPER_LIMITS: UpperLimit[] = [
  {
    key: 'vitamin-d',
    name: 'Vitamin D',
    unit: 'IU',
    ul: 4000,
    nearFrom: 0.9,
    citation: 'NIH ODS Vitamin D fact sheet, adult UL 4,000 IU (100 mcg).',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/',
  },
  {
    key: 'vitamin-a',
    name: 'Vitamin A',
    unit: 'mcg',
    ul: 3000,
    nearFrom: 0.9,
    citation: 'NIH ODS Vitamin A fact sheet, adult UL 3,000 mcg RAE preformed retinol.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/VitaminA-HealthProfessional/',
  },
  {
    key: 'vitamin-e',
    name: 'Vitamin E',
    unit: 'mg',
    ul: 1000,
    nearFrom: 0.9,
    citation: 'NIH ODS Vitamin E fact sheet, adult UL 1,000 mg supplemental alpha-tocopherol.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/VitaminE-HealthProfessional/',
  },
  {
    key: 'vitamin-c',
    name: 'Vitamin C',
    unit: 'mg',
    ul: 2000,
    nearFrom: 0.9,
    citation: 'NIH ODS Vitamin C fact sheet, adult UL 2,000 mg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/VitaminC-HealthProfessional/',
  },
  {
    key: 'vitamin-b6',
    name: 'Vitamin B6',
    unit: 'mg',
    ul: 100,
    nearFrom: 0.9,
    citation: 'NIH ODS Vitamin B6 fact sheet, adult UL 100 mg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/VitaminB6-HealthProfessional/',
  },
  {
    key: 'folate',
    name: 'Folate',
    unit: 'mcg',
    ul: 1000,
    nearFrom: 0.9,
    citation: 'NIH ODS Folate fact sheet, adult UL 1,000 mcg folic acid from supplements and fortified food.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/',
  },
  {
    key: 'niacin',
    name: 'Niacin',
    unit: 'mg',
    ul: 35,
    nearFrom: 0.9,
    citation: 'NIH ODS Niacin fact sheet, adult UL 35 mg from supplements and fortified food.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Niacin-HealthProfessional/',
  },
  {
    key: 'choline',
    name: 'Choline',
    unit: 'mg',
    ul: 3500,
    nearFrom: 0.9,
    citation: 'NIH ODS Choline fact sheet, adult UL 3,500 mg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Choline-HealthProfessional/',
  },
  {
    key: 'calcium',
    name: 'Calcium',
    unit: 'mg',
    ul: 2500,
    nearFrom: 0.9,
    citation: 'NIH ODS Calcium fact sheet, UL 2,500 mg for adults 19 to 50.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Calcium-HealthProfessional/',
  },
  {
    key: 'iron',
    name: 'Iron',
    unit: 'mg',
    ul: 45,
    nearFrom: 0.9,
    citation: 'NIH ODS Iron fact sheet, adult UL 45 mg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Iron-HealthProfessional/',
  },
  {
    key: 'zinc',
    name: 'Zinc',
    unit: 'mg',
    ul: 40,
    nearFrom: 0.9,
    citation: 'NIH ODS Zinc fact sheet, adult UL 40 mg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Zinc-HealthProfessional/',
  },
  {
    key: 'magnesium',
    name: 'Magnesium',
    unit: 'mg',
    ul: 350,
    nearFrom: 0.9,
    citation: 'NIH ODS Magnesium fact sheet, adult UL 350 mg from supplements only.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/',
  },
  {
    key: 'selenium',
    name: 'Selenium',
    unit: 'mcg',
    ul: 400,
    nearFrom: 0.9,
    citation: 'NIH ODS Selenium fact sheet, adult UL 400 mcg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Selenium-HealthProfessional/',
  },
  {
    key: 'iodine',
    name: 'Iodine',
    unit: 'mcg',
    ul: 1100,
    nearFrom: 0.9,
    citation: 'NIH ODS Iodine fact sheet, adult UL 1,100 mcg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Iodine-HealthProfessional/',
  },
  {
    key: 'copper',
    name: 'Copper',
    unit: 'mg',
    ul: 10,
    nearFrom: 0.9,
    citation: 'NIH ODS Copper fact sheet, adult UL 10 mg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Copper-HealthProfessional/',
  },
  {
    key: 'manganese',
    name: 'Manganese',
    unit: 'mg',
    ul: 11,
    nearFrom: 0.9,
    citation: 'NIH ODS Manganese fact sheet, adult UL 11 mg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Manganese-HealthProfessional/',
  },
  {
    key: 'molybdenum',
    name: 'Molybdenum',
    unit: 'mcg',
    ul: 2000,
    nearFrom: 0.9,
    citation: 'NIH ODS Molybdenum fact sheet, adult UL 2,000 mcg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Molybdenum-HealthProfessional/',
  },
  {
    key: 'boron',
    name: 'Boron',
    unit: 'mg',
    ul: 20,
    nearFrom: 0.9,
    citation: 'NIH ODS Boron fact sheet, adult UL 20 mg.',
    sourceUrl: 'https://ods.od.nih.gov/factsheets/Boron-HealthProfessional/',
  },
];

export function upperLimitFor(key: string): UpperLimit | undefined {
  return UPPER_LIMITS.find((row) => row.key === key);
}
