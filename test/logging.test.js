import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import winston from 'winston';
import { createAppLogger, logger, levels } from '../src/config/logger.config.js';
import app from '../src/app.js';
import { errorHandler } from '../src/middlewares/error.middleware.js';

async function flush(log) { const done = once(log, 'finish'); log.end(); await done; log.close(); }

test('Filtros de consola por entorno y persistencia exclusiva de errores', async () => {
  for (const environment of ['development', 'production']) {
    const directory = await mkdtemp(join(tmpdir(), 'shipnow-'));
    const log = createAppLogger({ environment, directory, consoleOutput: false });
    const captured = [];
    const stream = new (await import('node:stream')).Writable({ objectMode: true,
      write(info, encoding, callback) { captured.push(info.level); callback(); } });
    log.add(new winston.transports.Stream({ stream, level: log.level }));
    for (const level of Object.keys(levels)) log.log(level, 'evento-' + level);
    await flush(log);
    assert.deepEqual(captured, environment === 'production'
      ? ['fatal', 'error', 'warning', 'info'] : Object.keys(levels));
    const contents = await readFile(join(directory, 'error.log'), 'utf8');
    assert.match(contents, /\[fatal\] evento-fatal/);
    assert.match(contents, /\[error\] evento-error/);
    assert.doesNotMatch(contents, /evento-(debug|http|info|warning)/);
    assert.match(contents, /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
    await rm(directory, { recursive: true, force: true });
  }
});

test('Rotación mantiene un historial limitado', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'shipnow-rotation-'));
  const log = createAppLogger({ directory, consoleOutput: false, maxsize: 200, maxFiles: 3 });
  // Esperar cada escritura evita agrupar todo el lote antes de la rotación.
  for (let i = 0; i < 12; i++) {
    log.error('Rotación ' + i + ' ' + 'x'.repeat(160));
    await new Promise(resolve => setTimeout(resolve, 25));
  }
  await flush(log);
  const files = (await readdir(directory)).filter(file => file.endsWith('.log'));
  assert.ok(files.length > 1 && files.length <= 3, files.join(','));
  const all = await Promise.all(files.map(file => readFile(join(directory,file),'utf8')));
  assert.ok(all.some(contents => contents.includes('Rotación 11')));
  await rm(directory, { recursive: true, force: true });
});

test('Endpoint, mocks y errores conservan sus respuestas y registran niveles', async () => {
  const captured = [];
  const stream = new (await import('node:stream')).Writable({ objectMode: true,
    write(info, encoding, callback) { captured.push({ ...info }); callback(); } });
  const capture = new winston.transports.Stream({ stream, level: 'debug' });
  logger.add(capture);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const url = 'http://127.0.0.1:' + server.address().port;
  try {
    const response = await fetch(url + '/api/loggerTest');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).levels.length, 6);
    assert.equal(captured.filter(info => info.test).length, 6);
    const mock = await fetch(url + '/api/mocks/orders?qty=2');
    assert.equal(mock.status, 200);
    assert.equal((await mock.json()).orders.length, 2);
    const invalid = await fetch(url + '/api/mocks/users?qty=0');
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).error.code, 'INVALID_MOCK_QUANTITY');
    const missing = await fetch(url + '/ruta-inexistente');
    assert.equal(missing.status, 404);
    assert.ok(captured.some(info => info.level === 'warning' && info.code === 'ROUTE_NOT_FOUND'));
    assert.ok(captured.some(info => info.level === 'warning' && info.code === 'INVALID_MOCK_QUANTITY'));
    let status, body;
    errorHandler(new Error('detalle privado'), { method: 'GET', path: '/fallo' }, {
      headersSent: false, status(value) { status = value; return this; }, json(value) { body = value; }
    }, () => {});
    assert.equal(status, 500);
    assert.equal(body.error.code, 'INTERNAL_ERROR');
    assert.ok(!JSON.stringify(body).includes('detalle privado'));
    assert.ok(captured.some(info => info.level === 'error' && info.code === 'INTERNAL_ERROR'));
  } finally {
    await new Promise(resolve => server.close(resolve));
    logger.remove(capture);
    capture.end();
    await flush(logger);
  }
});
