import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import SwaggerParser from '@apidevtools/swagger-parser';
import app from '../src/app.js';
import { openapi } from '../src/config/swagger.config.js';
import { Order } from '../src/models/order.model.js';
import { Delivery } from '../src/models/delivery.model.js';
import { User } from '../src/models/user.model.js';
import { logger } from '../src/config/logger.config.js';
const id='507f1f77bcf86cd799439011';
test('OpenAPI válido, tags, esquemas y parámetros de ruta completos', async () => {
  await SwaggerParser.validate(structuredClone(openapi));
  for(const tag of ['Users','Orders','Deliveries','Mocks','Logger']) assert.ok(openapi.tags.some(t=>t.name===tag));
  for(const [path, methods] of Object.entries(openapi.paths)) for(const operation of Object.values(methods)) {
    assert.ok(operation.summary); assert.ok(operation.responses); assert.ok(operation.tags.length);
    for(const match of path.matchAll(/\{([^}]+)\}/g)) assert.ok(operation.parameters.some(p=>p.name===match[1]&&p.required));
  }
});
test('Swagger local, mocks, errores y rutas de pedidos y entregas', async t => {
  const server=app.listen(0,'127.0.0.1'); await once(server,'listening');
  const base='http://127.0.0.1:'+server.address().port;
  const request=async(path,method='GET',body)=>{
    const result=await fetch(base+path,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
    return {status:result.status,body:await result.json()};
  };
  try {
    const ui=await fetch(base+'/api/docs/'); assert.equal(ui.status,200); assert.match(await ui.text(),/swagger-ui/);
    const asset=await fetch(base+'/api/docs/swagger-ui-bundle.js'); assert.equal(asset.status,200); assert.match(asset.headers.get('content-type'),/javascript/);
    assert.equal((await request('/api/docs/openapi.json')).body.openapi,'3.0.3');
    for(const entity of ['users','drivers','orders','deliveries','lote']) assert.equal((await request('/api/mocks/'+entity+'?qty=2')).status,200);
    for(const qty of ['0','101','1.5','abc','01','2&qty=3']) {
      const result=await request('/api/mocks/users?qty='+qty); assert.equal(result.status,400);assert.equal(result.body.error.code,'INVALID_MOCK_QUANTITY');
    }
    assert.equal((await request('/api/mocks/seed','POST',{qty:2})).body.error.code,'INVALID_INPUT');
    assert.equal((await request('/api/mocks/seed?collection=no','POST')).body.error.code,'INVALID_MOCK_COLLECTION');
    for(const type of ['orders','deliveries']) {
      assert.equal((await request('/api/'+type+'/bad')).status,400);
      const result=await request('/api/'+type+'/'+id+'/status','PATCH',{status:'INVALID'});
      assert.equal(result.status,400);assert.equal(result.body.error.code,type==='orders'?'INVALID_ORDER_STATUS':'INVALID_DELIVERY_STATUS');
    }
    // Dobles de persistencia: verifican la integración HTTP sin requerir MongoDB.
    t.mock.method(User,'findById',()=>({lean:async()=>({_id:id,role:'USER'})}));
    t.mock.method(Order,'create',async data=>({_id:id,status:'PENDING',...data}));
    t.mock.method(Order,'findById',()=>({lean:async()=>({_id:id})}));
    t.mock.method(Delivery,'create',async data=>({_id:id,status:'PENDING',...data}));
    const order=await request('/api/orders','POST',{user:id,address:'Calle 123',description:'Paquete',items:[{name:'Libro',quantity:2}]});
    assert.equal(order.status,201);assert.equal(order.body.payload.items[0].quantity,2);
    assert.equal((await request('/api/orders','POST',{user:id,address:'Calle',description:'Paquete',items:[{name:'Libro',quantity:0}]})).status,400);
    const delivery=await request('/api/deliveries','POST',{order:id});assert.equal(delivery.status,201);assert.equal(delivery.body.payload.driver,null);
    assert.equal((await request('/api/deliveries','POST',{order:id,driver:id})).status,400);
    t.mock.method(Order,'findByIdAndUpdate',()=>({lean:async()=>null}));
    assert.equal((await request('/api/orders/'+id+'/status','PATCH',{status:'DELIVERED'})).body.error.code,'ORDER_NOT_FOUND');
    t.mock.method(Delivery,'findByIdAndUpdate',()=>({lean:async()=>({_id:id,status:'ASSIGNED'})}));
    assert.equal((await request('/api/deliveries/'+id+'/status','PATCH',{status:'ASSIGNED'})).body.payload.status,'ASSIGNED');
    assert.equal((await request('/no-existe')).body.error.code,'ROUTE_NOT_FOUND');
    const malformed=await fetch(base+'/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});
    assert.equal((await malformed.json()).error.code,'INVALID_JSON');
  } finally { await new Promise(resolve=>server.close(resolve)); const done=once(logger,'finish');logger.end();await done;logger.close(); }
});

