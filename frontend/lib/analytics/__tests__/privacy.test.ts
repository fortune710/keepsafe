import { sanitizeEvent, screenName } from '../privacy';

describe('analytics privacy', () => {
  it('normalizes dynamic routes and excludes the startup redirect', () => {
    expect(screenName('/')).toBeNull();
    expect(screenName('/invite/private-code')).toBe('/invite/[id]');
    expect(screenName('/time-capsule-reveal/private-id')).toBe('/time-capsule-reveal/[entryId]');
    expect(screenName('/monthly-dumps/2026-04')).toBe('/monthly-dumps/[month]');
    expect(screenName('/unknown/private-info')).toBe('/not-found');
  });

  it('strips arbitrary route data, person properties, and search content', () => {
    const event = sanitizeEvent({ event: 'ai_search', properties: { token: 'key', query: 'private words', uri: 'file://private', screen_name: '/capture', type: 'private text' }, $set: { email: 'private@example.com' } });
    expect(event).toEqual({ event: 'ai_search', properties: { token: 'key', screen_name: '/capture', $ip: '0.0.0.0' } });
  });

  it('redacts exception content and rejects unreviewed events', () => {
    expect(sanitizeEvent({ event: 'unreviewed', properties: { text: 'private' } })).toBeNull();
    expect(sanitizeEvent({ event: '$exception', properties: { $exception_list: [{ type: 'TypeError', value: 'private', stacktrace: { frames: [{ filename: 'private' }] } }] } })).toEqual({
      event: '$exception', properties: { $exception_list: [{ type: 'TypeError', value: 'Details removed for privacy' }], $ip: '0.0.0.0' },
    });
  });
});
