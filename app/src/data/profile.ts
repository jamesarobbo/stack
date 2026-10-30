import { api } from '../api';
import { isAgeRange, isSex } from '../health/demographics';
import { getSetting } from '../settings';

export async function syncProfile(token: string | null) {
  if (!token) return;
  const ageRange = getSetting('ageRange');
  const sex = getSetting('sex');
  const displayName = getSetting('displayName');
  await api('/v1/me/profile', {
    method: 'PUT',
    token,
    body: {
      ageRange: isAgeRange(ageRange) ? ageRange : undefined,
      sex: isSex(sex) ? sex : undefined,
      displayName: displayName || null,
    },
  });
}
