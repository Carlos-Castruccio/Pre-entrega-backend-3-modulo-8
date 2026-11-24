import { AppError } from '../utils/AppError.js';

function integer(value, name, maximum) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || Number(value) > maximum) {
    throw new AppError('INVALID_INPUT', { message: name + ' debe ser un entero entre 1 y ' + maximum });
  }
  return Number(value);
}

export function parsePagination({ page = '1', limit = '20' }) {
  const size = integer(limit, 'limit', 100);
  return { limit: size, skip: (integer(page, 'page', 10000) - 1) * size };
}
