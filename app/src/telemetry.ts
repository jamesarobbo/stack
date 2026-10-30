import Constants from 'expo-constants';
import { POSTHOG_HOST, POSTHOG_KEY, SENTRY_DSN } from './config';

let posthog: { capture: (event: string, properties?: Record<string, string | number | boolean>) => void } | null = null;
let ready = false;

export function telemetryStatus() {
  return {
    posthog: Boolean(POSTHOG_KEY),
    sentry: Boolean(SENTRY_DSN),
  };
}

/** Screen names and product events only. Do not pass health samples or supplement doses. */
export function track(event: string, properties?: Record<string, string | number | boolean>) {
  if (!ready || !posthog) return;
  posthog.capture(event, properties);
}

export async function initTelemetry() {
  if (ready) return;
  ready = true;
  if (Constants.executionEnvironment === 'storeClient') return;
  if (SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/react-native') as {
        init: (options: { dsn: string; sendDefaultPii: boolean }) => void;
      };
      Sentry.init({ dsn: SENTRY_DSN, sendDefaultPii: false });
    } catch {
      // Native Sentry is unavailable outside a dev or store build.
    }
  }
  if (POSTHOG_KEY) {
    try {
      const { PostHog } = require('posthog-react-native') as {
        PostHog: new (key: string, options: { host: string }) => {
          capture: (event: string, properties?: Record<string, string | number | boolean>) => void;
        };
      };
      posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST });
    } catch {
      posthog = null;
    }
  }
}
