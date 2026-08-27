import { loadEnv } from '@axiom/config';

const env = loadEnv();

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LEVEL_ORDER[env.LOG_LEVEL];

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  constructor(private context: LogContext = {}) {}

  child(extra: LogContext): Logger {
    return new Logger({ ...this.context, ...extra });
  }

  private log(level: Level, msg: string, ctx?: LogContext): void {
    if (LEVEL_ORDER[level] < currentLevel) return;
    const payload = {
      ts: new Date().toISOString(),
      level,
      msg,
      ...this.context,
      ...ctx,
    };
    const line = JSON.stringify(payload);
    if (level === 'error' || level === 'warn') {
      console.error(line);
    } else {
      console.log(line);
    }
  }

  private logArg(level: Level, a: string | LogContext, b?: LogContext | string): void {
    if (typeof a === 'string') {
      this.log(level, a, typeof b === 'object' && b !== null ? (b as LogContext) : undefined);
    } else {
      const msg = typeof b === 'string' ? b : '';
      this.log(level, msg, a);
    }
  }

  debug(msgOrCtx: string | LogContext, ctxOrMsg?: LogContext | string): void {
    this.logArg('debug', msgOrCtx, ctxOrMsg);
  }
  info(msgOrCtx: string | LogContext, ctxOrMsg?: LogContext | string): void {
    this.logArg('info', msgOrCtx, ctxOrMsg);
  }
  warn(msgOrCtx: string | LogContext, ctxOrMsg?: LogContext | string): void {
    this.logArg('warn', msgOrCtx, ctxOrMsg);
  }
  error(msgOrCtx: string | LogContext, ctxOrMsg?: LogContext | string): void {
    this.logArg('error', msgOrCtx, ctxOrMsg);
  }
}

export const logger = new Logger({ service: 'axiom-bff' });
