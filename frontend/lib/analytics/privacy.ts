import { sanitizeExceptionList } from './diagnostics';

/** Stable route names are the only screen names allowed in analytics. */
const SCREENS = new Set([
  '/onboarding', '/onboarding/auth', '/onboarding/value-props', '/onboarding/invite',
  '/onboarding/forgot-password', '/onboarding/forgot-password-success',
  '/onboarding/reset-password', '/onboarding/sign-up-success', '/capture',
  '/capture/details', '/diary', '/diary/entries', '/calendar', '/calendar/day',
  '/friends', '/settings', '/settings/about', '/settings/blocked-users',
  '/settings/legal', '/settings/notifications', '/settings/privacy',
  '/settings/profile', '/settings/storage', '/dreamscape', '/report-entry',
  '/search', '/social', '/not-found', '/invite/[id]', '/monthly-dumps/[month]',
  '/time-capsule-reveal/[entryId]',
]);

export function screenName(path: string): string | null {
  if (path === '/') return null; // Auth redirect, not a user-facing destination.
  if (/^\/invite\/[^/]+\/?$/.test(path)) return '/invite/[id]';
  if (/^\/monthly-dumps\/[^/]+\/?$/.test(path)) return '/monthly-dumps/[month]';
  if (/^\/time-capsule-reveal\/[^/]+\/?$/.test(path)) return '/time-capsule-reveal/[entryId]';
  const normalized = path.replace(/\/$/, '') || '/';
  return SCREENS.has(normalized) ? normalized : '/not-found';
}

const EVENTS = new Set([
  '$screen', '$identify', '$exception', '$feature_flag_called',
  'app_pickup', 'screen_left', 'auth_attempt', 'auth_result', 'entry_save_failed',
  'report_submitted', 'report_failed', 'onboarding_value_prop_action',
  'entry_captured', 'ai_search', 'ai_search_completed', 'ai_search_failed',
  'invite_accepted', 'friend_blocked', 'time_capsule_created',
  'time_capsule_release_requested', 'time_capsule_release_cancelled',
  'time_capsule_unlocked_viewed', 'vault_block_storage_cleanup_failed',
]);

// This is deliberately an allowlist: new event properties require a privacy review.
const SAFE_KEYS = new Set([
  'token', 'distinct_id', '$session_id', '$device_id', '$anon_distinct_id',
  '$process_person_profile', '$is_identified',
  '$lib', '$lib_version', '$app_name', '$app_namespace', '$app_version', '$app_build', '$os', '$os_name', '$os_version',
  '$device_type', '$device_model', '$device_manufacturer', '$screen_name',
  '$exception_level', '$feature_flag', '$feature_flag_response',
  'screen_name', 'pickup_id', 'pickup_kind', 'local_hour', 'utc_offset_minutes',
  'foreground_duration_ms', 'interacted_within_7_seconds', 'is_bounce', 'exit_reason',
  'platform', 'os_version', 'type',
  'reveal_type', 'blocked_user_entry_count', 'failed_removal_count', 'error_source',
  'duration_ms', 'operation', 'outcome', 'action', 'step',
]);
const SCREEN_KEYS = new Set(['$screen_name', 'screen_name']);
const ENUM_VALUES: Record<string, Set<string>> = {
  pickup_kind: new Set(['cold_start', 'resume']),
  exit_reason: new Set(['navigation', 'background']),
  type: new Set(['photo', 'video', 'audio', 'text', 'image']),
  reveal_type: new Set(['date', 'condition']),
  error_source: new Set(['render_boundary']),
  operation: new Set(['sign_up', 'sign_in', 'sign_out', 'password_reset_request', 'password_update']),
  outcome: new Set(['success', 'failure']),
  action: new Set(['next', 'skip']),
  '$feature_flag': new Set(['phone-number-sheet']),
};

type AnalyticsEvent = {
  event: string;
  properties?: Record<string, any>;
  $set?: Record<string, any>;
  $set_once?: Record<string, any>;
};

/** Filter every SDK event, including autocaptured errors, before it leaves the device. */
export function sanitizeEvent<T extends AnalyticsEvent>(event: T): T | null {
  if (!EVENTS.has(event.event)) return null;
  const properties: Record<string, any> = {};
  for (const [key, value] of Object.entries(event.properties ?? {})) {
    if (!SAFE_KEYS.has(key)) continue;
    if (SCREEN_KEYS.has(key)) {
      if (typeof value === 'string' && SCREENS.has(value)) properties[key] = value;
      continue;
    }
    if (ENUM_VALUES[key] && (typeof value !== 'string' || !ENUM_VALUES[key].has(value))) continue;
    if (typeof value === 'number' || typeof value === 'boolean' || (typeof value === 'string' && value.length <= 100)) {
      properties[key] = value;
    }
  }
  // Preserve only reviewed diagnostics and safe stack coordinates.
  if (event.event === '$exception' && Array.isArray(event.properties?.$exception_list)) {
    properties.$exception_list = sanitizeExceptionList(event.properties.$exception_list);
  }
  // Prevent ingestion-side IP geolocation; do not send person properties.
  properties.$ip = '0.0.0.0';
  const { $set, $set_once, ...rest } = event;
  return { ...rest, properties } as T;
}
