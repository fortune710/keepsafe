import { analyticsEnabled } from '../environment';

describe('analytics environment', () => {
  const production = { dev: false, environment: 'production', channel: 'production', platform: 'ios', apiKey: 'key', host: 'https://example.com' };
  it('only enables configured native builds outside development', () => {
    expect(analyticsEnabled(production)).toBe(true);
    expect(analyticsEnabled({ ...production, dev: true })).toBe(false);
    expect(analyticsEnabled({ ...production, environment: 'development' })).toBe(false);
    expect(analyticsEnabled({ ...production, environment: 'test' })).toBe(false);
    expect(analyticsEnabled({ ...production, channel: 'development' })).toBe(false);
    expect(analyticsEnabled({ ...production, platform: 'web' })).toBe(false);
    expect(analyticsEnabled({ ...production, apiKey: undefined })).toBe(false);
    expect(analyticsEnabled({ ...production, host: undefined })).toBe(false);
  });
});
