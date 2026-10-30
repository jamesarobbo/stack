import type { SampleInput } from '../domain/types';

export type HealthConnection = {
  mode: 'example' | 'healthkit';
  message: string;
  samples?: SampleInput[];
};
