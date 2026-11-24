import request from 'supertest';
import { expect } from 'chai';
import app from '../src/app.js';
import { ERROR_DICTIONARY } from '../src/errors/errorDictionary.js';
export const api = request(app);
export const missingId = '507f1f77bcf86cd799439011';
export function errorResponse(response, code) {
  expect(response.status).to.equal(ERROR_DICTIONARY[code].statusCode);
  expect(response.body).to.have.all.keys('status', 'error');
  expect(response.body.status).to.equal('error');
  expect(response.body.error).to.have.all.keys('code', 'message');
  expect(response.body.error.code).to.equal(code);
  expect(response.body.error.message).to.be.a('string').and.not.empty;
  // INVALID_INPUT permite mensajes específicos del campo; los demás son exactos.
  if (code !== 'INVALID_INPUT') expect(response.body.error.message).to.equal(ERROR_DICTIONARY[code].message);
}
export async function createUser() {
  const response = await api.post('/api/users').send({
    firstName: 'Ana', lastName: 'Prueba', email: 'ana@example.test', password: 'Prueba123!'
  });
  expect(response.status).to.equal(201);
  return response.body.payload;
}
export async function createOrder() {
  const user = await createUser();
  const response = await api.post('/api/orders').send({
    user: user._id, address: 'Calle 123', description: 'Libro', items: [{ name: 'Libro', quantity: 2 }]
  });
  expect(response.status).to.equal(201);
  return response.body.payload;
}
