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

  debug(msg: string, ctx?: LogContext): void {
    this.log('debug', msg, ctx);
  }
  info(msg: string, ctx?: LogContext): void {
    this.log('info', msg, ctx);
  }
  warn(msg: string, ctx?: LogContext): void {
    this.log('warn', msg, ctx);
  }
  error(msg: string, ctx?: LogContext): void {
    this.log('error', msg, ctx);
  }
}

export const logger = new Logger({ service: 'axiom-bff' });
