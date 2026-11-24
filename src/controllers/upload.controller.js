import * as service from '../services/upload.service.js';

export const requireEntity = (type, param) => async (req, res, next) => {
  try { await service.requireEntity(type, req.params[param]); next(); }
  catch (error) { next(error); }
};
export const attach = (type, param) => async (req, res, next) => {
  try {
    const payload = await service.attach(type, req.params[param], req.file, req.body);
    res.status(201).json({ status: 'success', payload });
  } catch (error) { next(error); }
};
