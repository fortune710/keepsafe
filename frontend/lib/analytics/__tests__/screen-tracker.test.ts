import { ScreenTracker } from '../screen-tracker';

describe('screen analytics', () => {
  let time: number;
  let events: { name: string; properties: Record<string, string | number | boolean> }[];
  let tracker: ScreenTracker;

  beforeEach(() => {
    time = 100000;
    events = [];
    let pickup = 0;
    tracker = new ScreenTracker((name, properties) => events.push({ name, properties }), () => `pickup-${++pickup}`, () => time);
    tracker.setScreen('/capture');
    tracker.foreground();
  });

  function left() {
    return events.filter((event) => event.name === 'screen_left').at(-1)?.properties;
  }

  it('counts an untouched visit of seven seconds or less as a bounce', () => {
    time += 7000;
    tracker.setScreen('/diary');
    expect(left()).toMatchObject({ screen_name: '/capture', foreground_duration_ms: 7000, is_bounce: true });
  });

  it('does not count a longer untouched visit as a bounce', () => {
    time += 7001;
    tracker.setScreen('/diary');
    expect(left()).toMatchObject({ foreground_duration_ms: 7001, is_bounce: false });
  });

  it('does not count an interaction followed by an early exit as a bounce', () => {
    time += 1000;
    tracker.interact();
    time += 1000;
    tracker.background();
    expect(left()).toMatchObject({ is_bounce: false, interacted_within_7_seconds: true, exit_reason: 'background' });
  });

  it('ends the foreground visit at background and starts a new pickup on resume', () => {
    time += 2000;
    tracker.background();
    tracker.background();
    time += 60000;
    tracker.foreground();
    tracker.foreground();
    time += 8000;
    tracker.setScreen('/diary');
    const exits = events.filter((event) => event.name === 'screen_left');
    expect(exits.map(({ properties }) => properties.foreground_duration_ms)).toEqual([2000, 8000]);
    expect(exits.map(({ properties }) => properties.is_bounce)).toEqual([true, false]);
    expect(events.filter((event) => event.name === 'app_pickup').map(({ properties }) => properties.pickup_kind)).toEqual(['cold_start', 'resume']);
    expect(events.filter((event) => event.name === '$screen').map(({ properties }) => properties.pickup_id)).toEqual(['pickup-1', 'pickup-2', 'pickup-2']);
  });

  it('does not generate a new visit for parameter-only changes to the same screen', () => {
    tracker.setScreen('/capture');
    expect(events.filter((event) => event.name === '$screen')).toHaveLength(1);
    expect(left()).toBeUndefined();
  });
});
