import { parsePagination } from '../services/pagination.js';
import { logger } from '../config/logger.config.js';
import * as service from '../services/product.service.js';

// Cada catch envía el error al middleware que arma la respuesta HTTP.
export async function getAll(req, res, next) {
  try {
    const result = await service.getAll(req.query.status, parsePagination(req.query));
    res.status(200).json({ status: 'success', payload: result });
  } catch (error) {
    next(error);
  }
}

export async function getById(req, res, next) {
  try {
    const result = await service.getById(req.params.pid);
    res.status(200).json({ status: 'success', payload: result });
  } catch (error) {
    next(error);
  }
}

export async function create(req, res, next) {
  try {
    const result = await service.create(req.body);
    logger.info('Producto creado correctamente', { id: String(result._id) });
    res.status(201).json({ status: 'success', payload: result });
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    const result = await service.update(req.params.pid, req.body);
    logger.info('Producto actualizado correctamente', { id: String(result._id) });
    res.status(200).json({ status: 'success', payload: result });
  } catch (error) {
    next(error);
  }
}

export async function remove(req, res, next) {
  try {
    const result = await service.remove(req.params.pid);
    res.status(200).json({ status: 'success', payload: result });
  } catch (error) {
    next(error);
  }
}

