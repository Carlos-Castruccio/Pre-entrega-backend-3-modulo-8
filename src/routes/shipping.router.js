import { parsePagination } from '../services/pagination.js';
import { Router } from 'express';
import * as uploads from '../controllers/upload.controller.js';
import { receiveFile } from '../config/upload.config.js';
import * as service from '../services/shipping.service.js';
export function shippingRouter(type, param) {
  const router = Router();
  if (type === 'deliveries') router.post('/:did/receipts',
    uploads.requireEntity('deliveries', 'did'), receiveFile, uploads.attach('deliveries', 'did'));
  const respond = (status, action) => async (req, res, next) => {
    try { res.status(status).json({ status: 'success', payload: await action(req) }); }
    catch (error) { next(error); }
  };
  router.get('/', respond(200, req => service.getAll(type, parsePagination(req.query))));
  router.get('/:' + param, respond(200, req => service.getById(type, req.params[param])));
  router.post('/', respond(201, req => service.create(type, req.body)));
  router.patch('/:' + param + '/status', respond(200, req => service.updateStatus(type, req.params[param], req.body)));
  return router;
}
