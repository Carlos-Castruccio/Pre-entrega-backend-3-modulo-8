import multer from 'multer';
import { mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppError } from '../utils/AppError.js';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const DOCUMENT_TYPES = Object.freeze(['IDENTITY', 'LICENSE', 'OTHER']);
export const uploadsDirectory = process.env.UPLOAD_DIR ?? join(tmpdir(), process.env.NODE_ENV === 'test' ? 'shipnow-test-uploads' : 'shipnow-uploads');
const formats = { 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] };
const storage = multer.diskStorage({
  destination(req, file, callback) {
    // El destino depende de la ruta, nunca de campos multipart cuyo orden controla el cliente.
    const directory = join(uploadsDirectory, 'pending');
    mkdir(directory, { recursive: true }).then(() => callback(null, directory), callback);
  },
  filename(req, file, callback) {
    callback(null, randomUUID() + extname(file.originalname).toLowerCase());
  }
});
const receive = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 1, parts: 2, fieldSize: 100 },
  fileFilter(req, file, callback) {
    if (!formats[file.mimetype]?.includes(extname(file.originalname).toLowerCase())) {
      return callback(new AppError('FILE_TYPE_INVALID'));
    }
    callback(null, true);
  }
}).single('file');

export function receiveFile(req, res, next) {
  receive(req, res, error => {
    if (!error) return next();
    const code = error instanceof multer.MulterError
      ? error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE'
        : error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT'
          ? 'FILE_FIELD_INVALID' : 'UPLOAD_INVALID'
      : error instanceof AppError ? error.code
        : error.code?.startsWith('E') ? 'FILE_SAVE_FAILED' : 'UPLOAD_INVALID';
    next(new AppError(code, { cause: error }));
  });
}
