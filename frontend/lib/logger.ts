type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const APP_TAG = '[KeepSafe]';

// Simple runtime flag based on env; default to 'debug' in development.
const isDev =
  process.env.EXPO_PUBLIC_NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'development';

function formatMessage(level: LogLevel, message: string, meta?: unknown): any[] {
  const prefix = `${APP_TAG} [${level.toUpperCase()}]`;
  if (meta === undefined) {
    return [prefix, message];
  }
  return [prefix, message, meta];
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (!isDev) return;
    // eslint-disable-next-line no-console
    console.debug(...formatMessage('debug', message, meta));
  },
  info(message: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.info(...formatMessage('info', message, meta));
  },
  warn(message: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.warn(...formatMessage('warn', message, meta));
  },
  error(message: string, meta?: unknown) {
    // eslint-disable-next-line no-console
    console.error(...formatMessage('error', message, meta));
  },
};


