import { expect } from 'chai';
import { api, createOrder, missingId, errorResponse } from './helpers.js';
for (const type of ['orders', 'deliveries']) {
  const base = '/api/' + type;
  const code = type === 'orders' ? 'ORDER' : 'DELIVERY';
  async function fixture() {
    const order = await createOrder();
    if (type === 'orders') return order;
    const r = await api.post(base).send({ order: order._id });
    expect(r.status).to.equal(201);
    expect(r.body.payload).to.include({ order: order._id, driver: null, status: 'PENDING' });
    return r.body.payload;
  }
  describe(type, () => {
    it('lista vacía', async () => {
      const r = await api.get(base);
      expect(r.status).to.equal(200);
      expect(r.body).to.deep.equal({ status: 'success', payload: [] });
    });
    it('crea, lista y consulta por ID con persistencia real', async () => {
      const item = await fixture();
      expect(item._id).to.match(/^[a-f0-9]{24}$/);
      expect(item.status).to.equal('PENDING');
      if (type === 'orders') {
        expect(item.address).to.equal('Calle 123');
        expect(item.items[0]).to.include({ name: 'Libro', quantity: 2 });
      }
      const list = await api.get(base);
      expect(list.status).to.equal(200);
      expect(list.body.status).to.equal('success');
      expect(list.body.payload).to.have.length(1);
      expect(list.body.payload[0]._id).to.equal(item._id);
      const found = await api.get(base + '/' + item._id);
      expect(found.status).to.equal(200);
      expect(found.body).to.deep.equal({ status: 'success', payload: item });
    });
    it('actualiza el estado y lo conserva', async () => {
      const item = await fixture();
      const r = await api.patch(base + '/' + item._id + '/status').send({ status: 'DELIVERED' });
      expect(r.status).to.equal(200);
      expect(r.body.payload).to.include({ _id: item._id, status: 'DELIVERED' });
      expect((await api.get(base + '/' + item._id)).body.payload.status).to.equal('DELIVERED');
    });
    it('rechaza datos incompletos y referencia inexistente', async () => {
      errorResponse(await api.post(base).send({}), 'INVALID_INPUT');
      const data = type === 'orders'
        ? { user: missingId, address: 'Calle', description: 'Paquete' } : { order: missingId };
      errorResponse(await api.post(base).send(data), type === 'orders' ? 'USER_NOT_FOUND' : 'ORDER_NOT_FOUND');
    });
    it('rechaza ID inválido y recurso inexistente', async () => {
      errorResponse(await api.get(base + '/bad'), 'INVALID_INPUT');
      errorResponse(await api.get(base + '/' + missingId), code + '_NOT_FOUND');
      errorResponse(await api.patch(base + '/' + missingId + '/status').send({ status: 'DELIVERED' }), code + '_NOT_FOUND');
    });
    it('rechaza estado inválido sin modificar el recurso', async () => {
      const item = await fixture();
      errorResponse(await api.patch(base + '/' + item._id + '/status').send({ status: 'INVALID' }), 'INVALID_' + code + '_STATUS');
      expect((await api.get(base + '/' + item._id)).body.payload.status).to.equal('PENDING');
    });
  });
}
