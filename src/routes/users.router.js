import { Router } from 'express';
import * as uploads from '../controllers/upload.controller.js';
import { receiveFile } from '../config/upload.config.js';
import * as controller from '../controllers/user.controller.js';

const router = Router();
router.post('/:uid/documents', uploads.requireEntity('users', 'uid'), receiveFile, uploads.attach('users', 'uid'));
router.get('/', controller.getAll);
router.get('/:uid', controller.getById);
router.post('/', controller.create);
router.put('/:uid', controller.update);
router.delete('/:uid', controller.remove);

export default router;
