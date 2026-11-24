import { expect } from 'chai';
import { api, createUser, missingId, errorResponse } from './helpers.js';
import { User } from '../src/models/user.model.js';
describe('Usuarios', () => {
  it('lista vacía sin datos previos', async () => {
    const r = await api.get('/api/users');
    expect(r.status).to.equal(200);
    expect(r.body).to.deep.equal({ status: 'success', payload: [] });
  });
  it('crea y lista un usuario persistido sin exponer password', async () => {
    const user = await createUser();
    const r = await api.get('/api/users');
    expect(r.status).to.equal(200);
    expect(r.body.status).to.equal('success');
    expect(r.body.payload).to.have.length(1);
    expect(r.body.payload[0]).to.include({ _id: user._id, email: 'ana@example.test', role: 'USER' });
    expect(r.body.payload[0]).not.to.have.property('password');
    const stored = await User.findById(user._id).select('+password');
    expect(stored.password).not.to.equal('Prueba123!');
  });
  it('consulta, actualiza y elimina', async () => {
    const user = await createUser();
    const r = await api.get('/api/users/' + user._id);
    expect(r.status).to.equal(200);
    expect(r.body.payload._id).to.equal(user._id);
    const updated = await api.put('/api/users/' + user._id).send({ firstName: 'Eva' });
    expect(updated.status).to.equal(200);
    expect(updated.body.payload.firstName).to.equal('Eva');
    expect((await api.delete('/api/users/' + user._id)).status).to.equal(200);
    errorResponse(await api.get('/api/users/' + user._id), 'USER_NOT_FOUND');
  });
  it('rechaza datos incompletos e ID inválido', async () => {
    errorResponse(await api.post('/api/users').send({ firstName: 'Ana' }), 'INVALID_INPUT');
    errorResponse(await api.get('/api/users/bad'), 'INVALID_INPUT');
    errorResponse(await api.get('/api/users/' + missingId), 'USER_NOT_FOUND');
  });
  it('rechaza email duplicado', async () => {
    await createUser();
    errorResponse(await api.post('/api/users').send({
      firstName: 'Otra', lastName: 'Prueba', email: 'ana@example.test', password: 'Prueba123!'
    }), 'DUPLICATE_RESOURCE');
  });
});
