/** Restrict PostHog to configured, non-development native app builds. */
export function analyticsEnabled({ dev, environment, channel, platform, apiKey, host }: {
  dev: boolean;
  environment?: string;
  channel: string | null;
  platform: string;
  apiKey?: string;
  host?: string;
}): boolean {
  if (dev || environment === 'development' || environment === 'test') return false;
  if (channel === 'development' || platform === 'web') return false;
  return Boolean(apiKey && host);
}
