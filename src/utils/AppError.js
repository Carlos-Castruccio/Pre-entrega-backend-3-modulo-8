import { ERROR_DICTIONARY } from '../errors/errorDictionary.js';

export class AppError extends Error {
  constructor(code = 'INVALID_INPUT', { message, cause } = {}) {
    const definition = ERROR_DICTIONARY[code] ?? ERROR_DICTIONARY.INTERNAL_ERROR;
    super(message ?? definition.message, { cause });
    this.name = new.target.name;
    this.code = ERROR_DICTIONARY[code] ? code : 'INTERNAL_ERROR';
    this.statusCode = definition.statusCode;
  }
}
export class UserNotFoundError extends AppError {
  constructor() { super('USER_NOT_FOUND'); }
}
export class ProductNotFoundError extends AppError {
  constructor() { super('PRODUCT_NOT_FOUND'); }
}
export class InvalidStatusError extends AppError {
  constructor() { super('INVALID_STATUS'); }
}
export class InvalidMockQuantityError extends AppError {
  constructor() { super('INVALID_MOCK_QUANTITY'); }
}
export class MockLoadError extends AppError {
  constructor(cause) { super('MOCK_LOAD_FAILED', { cause }); }
}
