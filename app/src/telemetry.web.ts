export function telemetryStatus() {
  return { posthog: false, sentry: false };
}

export function track(_event: string, _properties?: Record<string, string | number | boolean>) {}

export async function initTelemetry() {}
