export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

export type LogRecord = {
  level: Exclude<LogLevel, 'silent'>;
  time: string;
  name: string;
  msg: string;
  data?: Record<string, unknown>;
};

export type LogSink = (record: LogRecord) => void;

export interface Logger {
  trace(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(name: string): Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  silent: 100,
};

export type LoggerOptions = { level?: LogLevel; sink?: LogSink };

/** Writes human-readable lines to the console. Default sink in dev. */
export const consoleSink: LogSink = (r) => {
  const line = `[${r.time}] ${r.level.toUpperCase().padEnd(5)} ${r.name}: ${r.msg}`;
  const args: unknown[] = r.data ? [line, r.data] : [line];
  if (r.level === 'error') console.error(...args);
  else if (r.level === 'warn') console.warn(...args);
  // eslint-disable-next-line no-console
  else console.log(...args);
};

/** Emits one JSON object per line. Use on servers. */
/* eslint-disable no-console */
export const jsonSink: LogSink = (r) => {
  const out = JSON.stringify(r);
  if (r.level === 'error' || r.level === 'warn') console.error(out);
  else console.log(out);
};
/* eslint-enable no-console */

export const noopSink: LogSink = () => {};

export function createLogger(name: string, options: LoggerOptions = {}): Logger {
  const level = options.level ?? 'info';
  const sink = options.sink ?? consoleSink;
  const threshold = LEVEL_ORDER[level];

  const emit = (lvl: LogRecord['level'], msg: string, data?: Record<string, unknown>) => {
    if (LEVEL_ORDER[lvl] < threshold) return;
    sink({ level: lvl, time: new Date().toISOString(), name, msg, ...(data ? { data } : {}) });
  };

  return {
    trace: (m, d) => emit('trace', m, d),
    debug: (m, d) => emit('debug', m, d),
    info: (m, d) => emit('info', m, d),
    warn: (m, d) => emit('warn', m, d),
    error: (m, d) => emit('error', m, d),
    child: (childName) => createLogger(`${name}:${childName}`, options),
  };
}

export function parseLogLevel(value: string | undefined, fallback: LogLevel = 'info'): LogLevel {
  if (value && value in LEVEL_ORDER) return value as LogLevel;
  return fallback;
}
