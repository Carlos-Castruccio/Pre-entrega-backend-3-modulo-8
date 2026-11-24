import { expect } from 'chai';
import { api, missingId, errorResponse } from './helpers.js';
describe('Productos conservados del módulo anterior', () => {
  it('crea, lista, consulta, actualiza y elimina con estructura correcta', async () => {
    const created = await api.post('/api/products').send({ name: 'Libro', price: 10, stock: 2 });
    expect(created.status).to.equal(201);
    expect(created.body.status).to.equal('success');
    const product = created.body.payload;
    expect(product).to.include({ name: 'Libro', price: 10, stock: 2, status: 'AVAILABLE' });
    const list = await api.get('/api/products');
    expect(list.status).to.equal(200);
    expect(list.body.payload).to.have.length(1);
    expect(list.body.payload[0]._id).to.equal(product._id);
    const found = await api.get('/api/products/' + product._id);
    expect(found.status).to.equal(200);
    expect(found.body.payload).to.deep.equal(product);
    const updated = await api.put('/api/products/' + product._id).send({ stock: 0 });
    expect(updated.status).to.equal(200);
    expect(updated.body.payload).to.include({ stock: 0, status: 'OUT_OF_STOCK' });
    expect((await api.delete('/api/products/' + product._id)).status).to.equal(200);
    errorResponse(await api.get('/api/products/' + product._id), 'PRODUCT_NOT_FOUND');
  });
  it('valida datos, estados e IDs', async () => {
    errorResponse(await api.post('/api/products').send({}), 'INVALID_INPUT');
    errorResponse(await api.get('/api/products?status=BAD'), 'INVALID_STATUS');
    errorResponse(await api.get('/api/products/bad'), 'INVALID_INPUT');
    errorResponse(await api.get('/api/products/' + missingId), 'PRODUCT_NOT_FOUND');
    errorResponse(await api.put('/api/products/' + missingId).send({ stock: 1 }), 'PRODUCT_NOT_FOUND');
    errorResponse(await api.delete('/api/products/' + missingId), 'PRODUCT_NOT_FOUND');
  });
});
