// 日志工具

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const isDev = import.meta.env.DEV

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

let currentLevel: LogLevel = isDev ? 'debug' : 'error'

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel]
}

function format(level: LogLevel, tag: string, msg: string): string {
  const time = new Date().toISOString().slice(11, 23)
  return `[${time}] [${level.toUpperCase()}] [${tag}] ${msg}`
}

export const logger = {
  debug(tag: string, msg: string, ...args: unknown[]): void {
    if (shouldLog('debug')) console.debug(format('debug', tag, msg), ...args)
  },
  info(tag: string, msg: string, ...args: unknown[]): void {
    if (shouldLog('info')) console.info(format('info', tag, msg), ...args)
  },
  warn(tag: string, msg: string, ...args: unknown[]): void {
    if (shouldLog('warn')) console.warn(format('warn', tag, msg), ...args)
  },
  error(tag: string, msg: string, ...args: unknown[]): void {
    if (shouldLog('error')) console.error(format('error', tag, msg), ...args)
  },
}

export function setLogLevel(level: LogLevel): void {
  currentLevel = level
}
