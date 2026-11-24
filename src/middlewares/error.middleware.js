import { logger } from '../config/logger.config.js';
import { AppError } from '../utils/AppError.js';

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let normalized = error;
  if (!(error instanceof AppError)) {
    const code = error.code === 11000 ? 'DUPLICATE_RESOURCE'
      : error.type === 'entity.parse.failed' ? 'INVALID_JSON'
      : error.type === 'entity.too.large' ? 'PAYLOAD_TOO_LARGE'
      : ['ValidationError', 'CastError'].includes(error.name) ? 'INVALID_INPUT'
      : 'INTERNAL_ERROR';
    normalized = new AppError(code, { cause: error });
  }
  const level = normalized.statusCode >= 500 ? 'error' : 'warning';
  logger.log(level, normalized.message, {
    code: normalized.code, status: normalized.statusCode,
    method: req.method, path: req.path,
    ...(normalized.cause ? { errorName: normalized.cause.name } : {})
  });
  return res.status(normalized.statusCode).json({
    status: 'error',
    error: { code: normalized.code, message: normalized.message }
  });
}
