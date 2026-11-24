import { mkdir, rename, unlink, open } from 'node:fs/promises';
import { basename, join } from 'node:path';
import * as repository from '../repositories/upload.repository.js';
import { validateId } from './validation.js';
import { AppError } from '../utils/AppError.js';
import { DOCUMENT_TYPES, uploadsDirectory } from '../config/upload.config.js';
import { logger } from '../config/logger.config.js';

const missing = type => type === 'users' ? 'USER_NOT_FOUND' : 'DELIVERY_NOT_FOUND';
export async function requireEntity(type, id) {
  validateId(id);
  if (!await repository.findEntity(type, id)) throw new AppError(missing(type));
}

async function validateSignature(file) {
  const handle = await open(file.path, 'r');
  try {
    const bytes = Buffer.alloc(8);
    await handle.read(bytes, 0, 8, 0);
    const valid = file.mimetype === 'application/pdf' ? bytes.subarray(0, 5).toString() === '%PDF-'
      : file.mimetype === 'image/png' ? bytes.equals(Buffer.from([137,80,78,71,13,10,26,10]))
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!valid) throw new AppError('FILE_TYPE_INVALID');
  } finally { await handle.close(); }
}

export async function attach(type, id, file, body = {}) {
  let currentPath = file?.path;
  try {
    if (!file) throw new AppError('FILE_REQUIRED');
    const documentType = type === 'users' ? body.documentType : 'RECEIPT';
    if (type === 'users' && !DOCUMENT_TYPES.includes(documentType)) throw new AppError('DOCUMENT_TYPE_INVALID');
    if (Object.keys(body).some(key => type !== 'users' || key !== 'documentType')) throw new AppError('UPLOAD_INVALID');
    await validateSignature(file);
    const folder = type === 'deliveries' ? 'receipts' : documentType === 'LICENSE' ? 'licenses' : 'documents';
    await mkdir(join(uploadsDirectory, folder), { recursive: true });
    const destination = join(uploadsDirectory, folder, file.filename);
    await rename(file.path, destination);
    currentPath = destination;
    const metadata = {
      originalName: basename(file.originalname.replaceAll('\\', '/')),
      filename: file.filename, path: `uploads/${folder}/${file.filename}`,
      mimeType: file.mimetype, size: file.size, documentType, uploadedAt: new Date()
    };
    const entity = await repository.appendMetadata(type, id, metadata);
    if (!entity) throw new AppError(missing(type));
    logger.info(type === 'users' ? 'Documento cargado' : 'Comprobante asociado a entrega', {
      entityType: type, entityId: id, filename: file.filename, documentType
    });
    return entity;
  } catch (error) {
    if (currentPath) {
      try { await unlink(currentPath); }
      catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') logger.error('No se pudo eliminar archivo rechazado', { filename: file.filename });
      }
    }
    throw error instanceof AppError ? error : new AppError('FILE_SAVE_FAILED', { cause: error });
  }
}
