/** Only static, reviewed messages are sent. Unknown messages can contain private user data. */
const SAFE_MESSAGES = new Set([
  'Network request failed',
  'Failed to fetch',
  'Request timed out',
  'The operation timed out',
  'Screen rendering failed',
  'Out of memory',
  'Maximum call stack size exceeded',
  'JSON Parse error: Unexpected end of input',
]);
const SAFE_ERROR_TYPES = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError', 'URIError', 'EvalError']);
const SAFE_FRAME_PLATFORMS = new Set(['hermes', 'web:javascript', 'node:javascript', 'native']);
const SAFE_FUNCTIONS = new Set([
  'global', '<global>', 'anonymous', '<anonymous>', 'require', 'loadModuleImplementation',
  'RootLayout', 'ErrorFallback', 'handleSave', 'startSearch', 'signIn', 'signUp',
  'signOut', 'takePicture', 'startVideo', 'toggleRecording',
]);

export function safeDiagnosticMessage(value: unknown): string {
  if (typeof value !== 'string') return 'Details removed for privacy';
  if (SAFE_MESSAGES.has(value)) return value;
  const nullProperty = value.match(/^Cannot read (?:properties|property) of (undefined|null)(?: \(reading '[^\r\n]*'\))?$/);
  if (nullProperty) return `Cannot read property of ${nullProperty[1]}`;
  if (/^[^\r\n]+ is not a function$/.test(value)) return '[redacted] is not a function';
  return 'Details removed for privacy';
}

/** Preserve only known bundle names and numeric locations from a raw stack. */
export function safeDiagnosticStack(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.split('\n').slice(0, 100).map((line) => {
    const match = line.match(/(?:^|[\s/(])(index(?:\.android|\.ios)?\.bundle|main\.jsbundle)(?:\?[^\s:]*)?:(\d+):(\d+)/);
    return match ? `${match[1]}:${match[2]}:${match[3]}` : '';
  }).filter(Boolean).join('\n');
}

/** Drop arbitrary log attributes before the SDK queues a record. */
export function sanitizeDiagnosticLog<T extends { body: string; level?: string; attributes?: Record<string, unknown> }>(record: T) {
  const stack = safeDiagnosticStack(record.attributes?.stack);
  return {
    body: safeDiagnosticMessage(record.body),
    level: record.level as T['level'],
    attributes: {
      ...(record.attributes?.error_source === 'render_boundary' ? { error_source: 'render_boundary' } : {}),
      ...(stack ? { stack } : {}),
    },
  };
}

function object(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Retain reviewed messages and bundle coordinates without sending dynamic text or paths. */
export function sanitizeExceptionList(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 10).map((value) => {
    const error = object(value) ?? {};
    const mechanism = object(error.mechanism);
    const trace = object(error.stacktrace);
    const frames = Array.isArray(trace?.frames) ? trace.frames.slice(-100).map((value) => {
      const frame = object(value) ?? {};
      const safe: Record<string, unknown> = {};
      if (typeof frame.platform === 'string' && SAFE_FRAME_PLATFORMS.has(frame.platform)) safe.platform = frame.platform;
      if (typeof frame.function === 'string' && SAFE_FUNCTIONS.has(frame.function)) safe.function = frame.function;
      if (typeof frame.filename === 'string') {
        // Bundle URLs may include auth tokens or device paths. Keep only the known bundle name.
        const bundle = frame.filename.match(/(?:^|\/)(index(?:\.android|\.ios)?\.bundle|main\.jsbundle)(?:\?.*)?$/)?.[1];
        if (bundle) safe.filename = bundle;
      }
      for (const key of ['lineno', 'colno'] as const) {
        if (typeof frame[key] === 'number' && Number.isSafeInteger(frame[key]) && frame[key] >= 0) safe[key] = frame[key];
      }
      if (typeof frame.chunk_id === 'string' && /^(?:[0-9a-f]{32}|[0-9a-f]{64}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(frame.chunk_id)) safe.chunk_id = frame.chunk_id;
      if (typeof frame.in_app === 'boolean') safe.in_app = frame.in_app;
      return safe;
    }).filter((frame) => Object.keys(frame).length > 0) : [];
    return {
      type: typeof error.type === 'string' && SAFE_ERROR_TYPES.has(error.type) ? error.type : 'Error',
      value: safeDiagnosticMessage(error.value),
      ...(typeof mechanism?.handled === 'boolean' ? { mechanism: { handled: mechanism.handled } } : {}),
      ...(frames.length ? { stacktrace: { type: 'raw', frames } } : {}),
    };
  });
}
