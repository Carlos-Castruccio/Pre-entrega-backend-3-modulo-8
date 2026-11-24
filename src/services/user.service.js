import * as userRepository from '../repositories/user.repository.js';
import { USER_ROLES } from '../constants/index.js';
import { AppError, UserNotFoundError } from '../utils/AppError.js';
import { hashPassword } from '../utils/password.js';
import { validateBody, validateId, validateText } from './validation.js';

async function prepareUser(body, isUpdate = false) {
  validateBody(body, ['firstName', 'lastName', 'email', 'password']);
  const data = { ...body };

  for (const field of ['firstName', 'lastName', 'email']) {
    if (!isUpdate || field in data) data[field] = validateText(data[field], field);
  }
  if ('email' in data) {
    data.email = data.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new AppError('INVALID_INPUT', { message: 'El email no tiene un formato válido' });
    }
  }
  if (!isUpdate || 'password' in data) {
    if (typeof data.password !== 'string' || !data.password.trim() ||
        data.password.length < 8 || data.password.length > 128) {
      throw new AppError('INVALID_INPUT', { message: 'password debe tener entre 8 y 128 caracteres' });
    }
    data.password = await hashPassword(data.password);
  }
  // El alta pública siempre crea usuarios comunes.
  if (!isUpdate) data.role = USER_ROLES.USER;
  return data;
}

export function getAll(pagination) {
  return userRepository.getAll(pagination);
}

export async function getById(id) {
  validateId(id);
  const user = await userRepository.getById(id);
  if (!user) throw new UserNotFoundError();
  return user;
}

export async function create(body) {
  return userRepository.create(await prepareUser(body));
}

export async function update(id, body) {
  validateId(id);
  const user = await userRepository.update(id, await prepareUser(body, true));
  if (!user) throw new UserNotFoundError();
  return user;
}

export async function remove(id) {
  validateId(id);
  const user = await userRepository.remove(id);
  if (!user) throw new UserNotFoundError();
  return user;
}
