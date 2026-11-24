import { isAbsolute } from 'node:path';
import dotenv from 'dotenv';
import { levels } from './logger.config.js';

dotenv.config({ quiet: true });

const port = process.env.PORT;
const mongodbUri = process.env.MONGODB_URI;
const nodeEnv = process.env.NODE_ENV;

if (!port) {
  throw new Error('Falta la variable PORT en el archivo .env');} 
  
if (!mongodbUri) {
  throw new Error('Falta la variable MONGODB_URI en el archivo .env'); 
}

if (!nodeEnv) {
  throw new Error('Falta la variable NODE_ENV en el archivo .env'); 
}

if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('PORT debe ser un número entero entre 1 y 65535');
}

if (!mongodbUri.startsWith('mongodb://') && !mongodbUri.startsWith('mongodb+srv://')) {
  throw new Error('MONGODB_URI debe empezar con mongodb:// o mongodb+srv://');
}

if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV debe ser development, test o production');
}

const { LOG_LEVEL, ENABLE_SWAGGER, UPLOAD_DIR } = process.env;
if (LOG_LEVEL !== undefined && !Object.hasOwn(levels, LOG_LEVEL)) {
  throw new Error('LOG_LEVEL debe ser fatal, error, warning, info, http o debug');
}
if (ENABLE_SWAGGER !== undefined && !['true', 'false'].includes(ENABLE_SWAGGER)) {
  throw new Error('ENABLE_SWAGGER debe ser true o false');
}
if (UPLOAD_DIR !== undefined && !isAbsolute(UPLOAD_DIR)) {
  throw new Error('UPLOAD_DIR debe ser una ruta absoluta');
}

export const config = Object.freeze({
  port: Number(port),
  mongodbUri,
  nodeEnv
});
