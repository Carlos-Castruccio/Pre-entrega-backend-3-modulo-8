import { logger } from '../config/logger.config.js';
import * as service from '../services/mock.service.js';

export function preview(entity) {
  return (req, res, next) => {
    try {
      const qty = service.validateRequest(req.query);
      const result = service.preview(entity, qty);
      logger.info('Datos mock generados', { entity, qty });
      res.status(200).json(result);
    } catch (error) { next(error); }
  };
}
export async function seed(req, res, next) {
  try {
    const qty = service.validateRequest(req.query, req.body, true);
    const result = await service.seed(qty, req.query.collection);
    logger.info('Lote mock persistido', { qty, collection: req.query.collection ?? 'users',
      orders: result.colecciones?.pedidos ?? 0, inserted: result.insertados });
    res.status(201).json(result);
  } catch (error) { next(error); }
}
