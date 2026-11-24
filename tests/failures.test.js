import { expect } from 'chai';
import { mock } from 'node:test';
import { api, errorResponse } from './helpers.js';
import { User } from '../src/models/user.model.js';
import { Order } from '../src/models/order.model.js';
import { Delivery } from '../src/models/delivery.model.js';
import { logger } from '../src/config/logger.config.js';
describe('Fallos controlados de infraestructura', () => {
  afterEach(() => mock.restoreAll());
  for (const [path, model] of [['users', User], ['orders', Order], ['deliveries', Delivery]]) {
    it('GET ' + path + ': normaliza un fallo de persistencia a 500', async () => {
      mock.method(model, 'find', () => { throw new Error('detalle privado'); });
      const r = await api.get('/api/' + path);
      errorResponse(r, 'INTERNAL_ERROR');
      expect(JSON.stringify(r.body)).not.to.include('detalle privado');
    });
  }
  it('logger: normaliza un fallo de escritura a 500', async () => {
    const original = logger.log.bind(logger);
    mock.method(logger, 'log', (level, message, metadata) => {
      if (metadata?.test) throw new Error('fallo controlado');
      return original(level, message, metadata);
    });
    errorResponse(await api.get('/api/loggerTest'), 'INTERNAL_ERROR');
  });
  it('seed: normaliza un fallo de inserción a 503 sin dejar registros', async () => {
    mock.method(User, 'insertMany', async () => { throw new Error('fallo controlado'); });
    errorResponse(await api.post('/api/mocks/seed?qty=1'), 'MOCK_LOAD_FAILED');
    expect(await User.countDocuments()).to.equal(0);
  });
});
