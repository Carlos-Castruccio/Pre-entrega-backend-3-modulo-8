import { expect } from 'chai';
import { mock } from 'node:test';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { api, createUser, createOrder, errorResponse, missingId } from './helpers.js';
import { uploadsDirectory, MAX_FILE_SIZE } from '../src/config/upload.config.js';
import { User } from '../src/models/user.model.js';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
async function files() {
  return (await readdir(uploadsDirectory, { recursive: true, withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  })).filter(entry => entry.isFile()).map(entry => join(entry.parentPath, entry.name)).sort();
}

describe('Módulo 7: documentos y comprobantes', () => {
  let before;
  beforeEach(async () => { before = await files(); });
  afterEach(async () => {
    mock.restoreAll();
    for (const path of await files()) if (!before.includes(path)) await unlink(path);
  });
  it('guarda PDF y metadatos en usuario sin revelar contraseña, con archivo antes del tipo', async () => {
    const user = await createUser();
    const r = await api.post(`/api/users/${user._id}/documents`)
      .attach('file', pdf, 'dni.pdf').field('documentType', 'IDENTITY');
    expect(r.status).to.equal(201);
    expect(r.body.payload).not.to.have.property('password');
    const metadata = r.body.payload.documents[0];
    expect(metadata).to.have.all.keys('originalName', 'filename', 'path', 'mimeType', 'size', 'documentType', 'uploadedAt');
    expect(metadata.originalName).to.equal('dni.pdf');
    expect(metadata.size).to.equal(pdf.length);
    expect(metadata.path).to.equal('uploads/documents/' + metadata.filename);
    expect(await readFile(join(uploadsDirectory, 'documents', metadata.filename))).to.deep.equal(pdf);
    const get = await api.get(`/api/users/${user._id}`);
    expect(get.body.payload.documents).to.deep.equal(r.body.payload.documents);
  });
  it('guarda licencia PNG con tipo antes del archivo y acumula documentos', async () => {
    const user = await createUser();
    for (let i = 0; i < 2; i++) {
      const r = await api.post(`/api/users/${user._id}/documents`)
        .field('documentType', 'LICENSE').attach('file', png, 'licencia.png');
      expect(r.status).to.equal(201);
      expect(r.body.payload.documents).to.have.length(i + 1);
      expect(r.body.payload.documents[i].path).to.include('uploads/licenses/');
    }
    const stored = (await api.get(`/api/users/${user._id}`)).body.payload.documents;
    expect(stored[0].filename).not.to.equal(stored[1].filename);
  });
  it('asocia comprobante a entrega y lo devuelve al consultarla', async () => {
    const order = await createOrder();
    const delivery = await api.post('/api/deliveries').send({ order: order._id });
    expect(delivery.status).to.equal(201);
    const id = delivery.body.payload._id;
    const r = await api.post(`/api/deliveries/${id}/receipts`).attach('file', pdf, 'recibo.pdf');
    expect(r.status).to.equal(201);
    expect(r.body.payload.receipts[0].documentType).to.equal('RECEIPT');
    expect(r.body.payload.receipts[0].path).to.include('uploads/receipts/');
    expect((await api.get(`/api/deliveries/${id}`)).body.payload.receipts).to.deep.equal(r.body.payload.receipts);
  });
  it('rechaza archivo faltante en multipart y JSON', async () => {
    const user = await createUser();
    const path = `/api/users/${user._id}/documents`;
    errorResponse(await api.post(path).field('documentType', 'IDENTITY'), 'FILE_REQUIRED');
    errorResponse(await api.post(path).send({ documentType: 'IDENTITY' }), 'FILE_REQUIRED');
  });
  for (const type of ['INVALID', undefined]) {
    it('rechaza tipo de documento ' + String(type) + ' y limpia el archivo', async () => {
      const user = await createUser();
      let r = api.post(`/api/users/${user._id}/documents`).attach('file', pdf, 'dni.pdf');
      if (type) r = r.field('documentType', type);
      errorResponse(await r, 'DOCUMENT_TYPE_INVALID');
      expect(await files()).to.deep.equal(before);
      expect((await User.findById(user._id)).documents).to.have.length(0);
    });
  }
  it('rechaza entidades inexistentes e ID mal formado antes de guardar', async () => {
    for (const [path, code] of [
      [`/api/users/${missingId}/documents`, 'USER_NOT_FOUND'],
      [`/api/deliveries/${missingId}/receipts`, 'DELIVERY_NOT_FOUND'],
      ['/api/users/incorrecto/documents', 'INVALID_INPUT']
    ]) errorResponse(await api.post(path).attach('file', pdf, 'dni.pdf'), code);
    expect(await files()).to.deep.equal(before);
  });
  it('rechaza MIME, extensión y firma no permitidos', async () => {
    const user = await createUser();
    for (const [data, filename, contentType] of [
      [Buffer.from('texto'), 'archivo.txt', 'text/plain'],
      [pdf, 'archivo.exe', 'application/pdf'],
      [Buffer.from('archivo falso'), 'archivo.pdf', 'application/pdf']
    ]) errorResponse(await api.post(`/api/users/${user._id}/documents`)
      .field('documentType', 'OTHER').attach('file', data, { filename, contentType }), 'FILE_TYPE_INVALID');
    expect(await files()).to.deep.equal(before);
  });
  it('rechaza campo de archivo incorrecto y archivos múltiples', async () => {
    const user = await createUser();
    const path = `/api/users/${user._id}/documents`;
    errorResponse(await api.post(path).attach('document', pdf, 'dni.pdf'), 'FILE_FIELD_INVALID');
    errorResponse(await api.post(path).attach('file', pdf, 'a.pdf').attach('file', pdf, 'b.pdf'), 'FILE_FIELD_INVALID');
    expect(await files()).to.deep.equal(before);
  });
  it('rechaza archivo mayor de 5 MiB y limpia la carga parcial', async () => {
    const user = await createUser();
    errorResponse(await api.post(`/api/users/${user._id}/documents`)
      .field('documentType', 'OTHER').attach('file', Buffer.alloc(MAX_FILE_SIZE + 1), 'grande.pdf'), 'FILE_TOO_LARGE');
    expect(await files()).to.deep.equal(before);
  });
  it('rechaza campos adicionales y duplicados', async () => {
    const user = await createUser();
    errorResponse(await api.post(`/api/users/${user._id}/documents`)
      .field('extra', 'x').attach('file', pdf, 'dni.pdf'), 'DOCUMENT_TYPE_INVALID');
    errorResponse(await api.post(`/api/users/${user._id}/documents`)
      .field('documentType', 'IDENTITY').field('documentType', 'LICENSE').attach('file', pdf, 'dni.pdf'), 'UPLOAD_INVALID');
    expect(await files()).to.deep.equal(before);
  });
  it('elimina el archivo si falla MongoDB al asociarlo', async () => {
    const user = await createUser();
    mock.method(User, 'findByIdAndUpdate', () => { throw new Error('detalle privado'); });
    const r = await api.post(`/api/users/${user._id}/documents`)
      .field('documentType', 'IDENTITY').attach('file', pdf, 'dni.pdf');
    errorResponse(r, 'FILE_SAVE_FAILED');
    expect(JSON.stringify(r.body)).not.to.include('detalle privado');
    expect(await files()).to.deep.equal(before);
  });
  it('limpia archivo si la entidad desaparece durante la carga', async () => {
    const user = await createUser();
    mock.method(User, 'findByIdAndUpdate', () => ({ lean: async () => null }));
    errorResponse(await api.post(`/api/users/${user._id}/documents`)
      .field('documentType', 'OTHER').attach('file', pdf, 'dni.pdf'), 'USER_NOT_FOUND');
    expect(await files()).to.deep.equal(before);
  });
});
