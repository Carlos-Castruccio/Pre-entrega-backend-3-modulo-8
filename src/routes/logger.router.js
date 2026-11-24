import { Router } from 'express';
import { logger, levels } from '../config/logger.config.js';

const router = Router();
router.get('/', (req, res) => {
  for (const level of Object.keys(levels)) {
    logger.log(level, 'Prueba del logger: ' + level, { test: true });
  }
  res.json({ status: 'success', message: 'Prueba de logging ejecutada',
    levels: ['debug', 'http', 'info', 'warning', 'error', 'fatal'] });
});
export default router;
