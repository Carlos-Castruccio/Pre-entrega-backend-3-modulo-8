import { logger } from '../config/logger.config.js';

export function requestLogger(req, res, next) {
  const start = performance.now();
  const requestPath = req.path;
  res.on('finish', () => {
    // Sin body, credenciales ni query string en los registros.
    logger.http('Solicitud HTTP completada', { method: req.method, path: requestPath,
      status: res.statusCode, durationMs: Math.round(performance.now() - start) });
  });
  next();
}
