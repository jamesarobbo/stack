export const ADD_SUPPLEMENT_ROUTE = '/add';
export const ADD_BUTTON_LABEL = 'Add';
export const ADD_SUPPLEMENT_LABEL = 'Add supplement';
export const GO_TO_STACK_LABEL = 'Go to My Stack';
export const STACK_TAB_HREF = '/(tabs)/stack';
export const LOAD_EXAMPLE_LABEL = 'Load example data';
export const CLEAR_ALL_DATA_LABEL = 'Clear all data';
export const MONTHLY_REPORT_LABEL = 'Monthly report';

export function stackHeading(displayName: string): string {
  const name = displayName.trim();
  if (!name) return 'Your stack';
  return name.endsWith('s') ? `${name}' stack` : `${name}'s stack`;
}
