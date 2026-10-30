import type { SampleInput } from '../domain/types';

export type HealthConnection = {
  mode: 'unavailable' | 'healthkit';
  message: string;
  samples?: SampleInput[];
};
