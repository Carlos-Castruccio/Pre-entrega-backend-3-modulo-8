import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import winston from 'winston';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
export const levels = Object.freeze({ fatal: 0, error: 1, warning: 2, info: 3, http: 4, debug: 5 });
export const logsDirectory = fileURLToPath(new URL(process.env.NODE_ENV === 'test' ? '../../logs/test/' : '../../logs/', import.meta.url));

export function createAppLogger({ environment = process.env.NODE_ENV, directory = logsDirectory,
  level = environment === 'production' ? 'info' : 'debug',
  consoleOutput = process.env.NODE_ENV !== 'test', maxsize = 5 * 1024 * 1024, maxFiles = 5 } = {}) {
  mkdirSync(directory, { recursive: true });
  return winston.createLogger({
    levels, level,
    format: winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        const extra = Object.keys(metadata).length ? ' ' + JSON.stringify(metadata) : '';
        return timestamp + ' [' + level + '] ' + message + extra;
      })
    ),
    transports: [
      ...(consoleOutput ? [new winston.transports.Console({ level })] : []),
      new winston.transports.File({ filename: directory + '/error.log', level: 'error',
        maxsize, maxFiles, tailable: true })
    ]
  });
}

// Usar el nivel predeterminado para poder informar un LOG_LEVEL inválido al arrancar.
export const logger = createAppLogger({
  level: Object.hasOwn(levels, process.env.LOG_LEVEL) ? process.env.LOG_LEVEL : undefined
});

