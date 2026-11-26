export type AnalyticsSink = (event: string, properties: Record<string, string | number | boolean>) => void;

type Visit = { screen: string; startedAt: number; interacted: boolean; interactedWithin7Seconds: boolean };

/** Tracks visits and pickups in foreground time without collecting touch details. */
export class ScreenTracker {
  private visit: Visit | null = null;
  private screen: string | null = null;
  private active = false;
  private pickupId = '';
  private hasOpened = false;

  constructor(private emit: AnalyticsSink, private id: () => string, private now: () => number = Date.now) {}

  setScreen(screen: string | null) {
    if (screen === this.screen) return;
    this.leave('navigation');
    this.screen = screen;
    if (this.active) this.startVisit();
  }

  foreground() {
    if (this.active) return;
    this.active = true;
    this.pickupId = this.id();
    const date = new Date(this.now());
    this.emit('app_pickup', {
      pickup_id: this.pickupId,
      pickup_kind: this.hasOpened ? 'resume' : 'cold_start',
      local_hour: date.getHours(),
      utc_offset_minutes: -date.getTimezoneOffset(),
      ...(this.screen ? { screen_name: this.screen } : {}),
    });
    this.hasOpened = true;
    this.startVisit();
  }

  background() {
    if (!this.active) return;
    this.leave('background');
    this.active = false;
  }

  interact() {
    if (!this.active || !this.visit) return;
    this.visit.interacted = true;
    if (Math.max(0, this.now() - this.visit.startedAt) <= 7000) this.visit.interactedWithin7Seconds = true;
  }

  private startVisit() {
    if (!this.screen) return;
    this.visit = { screen: this.screen, startedAt: this.now(), interacted: false, interactedWithin7Seconds: false };
    this.emit('$screen', { screen_name: this.screen, pickup_id: this.pickupId });
  }

  private leave(reason: 'navigation' | 'background') {
    if (!this.visit) return;
    const duration = Math.max(0, this.now() - this.visit.startedAt);
    this.emit('screen_left', {
      screen_name: this.visit.screen,
      pickup_id: this.pickupId,
      foreground_duration_ms: duration,
      interacted_within_7_seconds: this.visit.interactedWithin7Seconds,
      is_bounce: duration <= 7000 && !this.visit.interacted,
      exit_reason: reason,
    });
    this.visit = null;
  }
}
