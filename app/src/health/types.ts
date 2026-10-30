import type { SampleInput } from '../domain/types';

export type HealthDemographics = {
  birthDate: string | null;
  sex: 'female' | 'male' | 'other' | 'notSet' | null;
};

export type HealthConnection = {
  mode: 'unavailable' | 'healthkit';
  message: string;
  samples?: SampleInput[];
  /** Public label for the device that measured resting heart rate, for example "Apple Watch". */
  device?: string;
  /** Read with the same permission sheet. Kept on the device to prefill the About you step. */
  demographics?: HealthDemographics;
};
