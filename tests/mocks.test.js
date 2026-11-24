import { expect } from 'chai';
import { api, errorResponse } from './helpers.js';
import { User } from '../src/models/user.model.js';
import { Order } from '../src/models/order.model.js';
import { Delivery } from '../src/models/delivery.model.js';
describe('Mocks', () => {
  for (const entity of ['users', 'drivers', 'orders', 'deliveries', 'lote']) {
    it(entity + ': genera cantidades y relaciones válidas sin persistir', async () => {
      const r = await api.get('/api/mocks/' + entity + '?qty=2');
      expect(r.status).to.equal(200);
      if (['users', 'drivers'].includes(entity)) {
        expect(r.body).to.have.length(2);
        for (const user of r.body) {
          expect(user).to.include.keys('_id', 'firstName', 'lastName', 'email', 'role');
          expect(user).not.to.have.property('password');
          if (entity === 'drivers') expect(user.role).to.equal('DELIVERY_DRIVER');
        }
      } else {
        expect(r.body.orders).to.have.length(2);
        for (const order of r.body.orders) expect(r.body.users.map(u => u._id)).to.include(order.user);
        if (r.body.deliveries) {
          expect(r.body.deliveries).to.have.length(2);
          for (const delivery of r.body.deliveries) {
            expect(r.body.orders.map(o => o._id)).to.include(delivery.order);
            if (delivery.driver) expect(r.body.users.map(u => u._id)).to.include(delivery.driver);
          }
        }
      }
      expect(await User.countDocuments()).to.equal(0);
      expect(await Order.countDocuments()).to.equal(0);
    });
    for (const qty of ['0', '-1', '101', '1.5', 'abc', '01', '2&qty=3']) {
      it(entity + ': rechaza qty=' + qty, async () => {
        errorResponse(await api.get('/api/mocks/' + entity + '?qty=' + qty), 'INVALID_MOCK_QUANTITY');
      });
    }
  }
  for (const collection of ['users', 'all']) {
    it('seed persiste ' + collection + ' y valida cantidades', async () => {
      const r = await api.post('/api/mocks/seed?qty=2&collection=' + collection);
      expect(r.status).to.equal(201);
      expect(r.body.insertados).to.equal(collection === 'users' ? 2 : 8);
      expect(await User.countDocuments()).to.equal(collection === 'users' ? 2 : 4);
      expect(await Order.countDocuments()).to.equal(collection === 'users' ? 0 : 2);
      expect(await Delivery.countDocuments()).to.equal(collection === 'users' ? 0 : 2);
      if (collection === 'all') {
        expect(r.body.colecciones).to.deep.equal({ usuarios: 4, pedidos: 2, entregas: 2 });
        for (const user of r.body.datos.users) expect(user).not.to.have.property('password');
        for (const order of await Order.find()) expect(await User.exists({ _id: order.user })).not.to.equal(null);
      }
    });
  }
  it('seed rechaza cantidad, colección y body incorrectos sin insertar', async () => {
    errorResponse(await api.post('/api/mocks/seed?qty=0'), 'INVALID_MOCK_QUANTITY');
    errorResponse(await api.post('/api/mocks/seed?collection=bad'), 'INVALID_MOCK_COLLECTION');
    errorResponse(await api.post('/api/mocks/seed').send({ qty: 2 }), 'INVALID_INPUT');
    expect(await User.countDocuments()).to.equal(0);
  });
});
