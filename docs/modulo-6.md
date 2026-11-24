# Testing funcional Módulo 6

## Evaluación de la base recibida

El proyecto sirve como base. Ya separa app.js de server.js, implementa usuarios, pedidos,
entregas, mocks y logger, documenta la API con Swagger y centraliza los errores.
La versión recibida usa node:test y dobles de modelos; no incluye Mocha, Chai ni
Supertest, ni un entorno funcional aislado con limpieza de MongoDB.
Sus pruebas previas se conservan en test/ y se ejecutan con npm run test:legacy.

## Ejecutar

Requiere Node >=20.19 y npm. Ejecutar desde la raíz:

    npm ci
    npm test
    npm test

Mocha organiza los casos, Chai valida respuestas y Supertest importa app.js para
hacer peticiones HTTP sin iniciar server.js. No hay que levantar la API manualmente.

## Entorno y datos

.env.test define NODE_ENV=test, PORT=8081 y TEST_DB_NAME=shipnow_test.
No se necesita un .env de desarrollo para npm test.
mongodb-memory-server inicia una instancia real y temporal de MongoDB, con puerto
disponible y URI generada. No usa MONGODB_URI del usuario ni una base externa.
La primera ejecución necesita internet para descargar el binario de MongoDB;
las siguientes reutilizan el binario descargado. También necesita permiso local
para ejecutar MongoDB y abrir puertos temporales.

Los hooks borran las colecciones de esa instancia antes de cada caso y cierran
la conexión y el proceso al terminar. Cada caso crea sus propios datos por HTTP;
no depende de datos manuales ni del orden. Los tests no se ejecutan en paralelo.
Los logs de pruebas van a logs/test/ y se excluyen de Git.

## Cobertura

- Usuarios: listado vacío y con datos, alta, consulta, actualización, eliminación,
  contraseña no expuesta, email duplicado, datos incompletos e IDs incorrectos.
- Pedidos y entregas: listados, creación y consulta persistida, actualización de
  estados, referencias inexistentes, datos incompletos y estados inválidos.
- Mocks: cinco previews con cantidades y relaciones; cantidades inválidas en cada
  uno; seed de users y all con comprobación en MongoDB y errores de entrada.
- Logger: respuesta y niveles; método y ruta no admitidos.
- Swagger: HTML, JavaScript, JSON y validación OpenAPI; método no admitido.
- Errores: status HTTP, status:error, código y mensaje; JSON inválido, exceso de
  tamaño y rutas inexistentes.

Se incluyen fallos controlados de consultas de usuarios, pedidos y entregas, de
escritura del logger (500) y de inserción seed (503), restaurando los dobles al
terminar cada caso. Los flujos exitosos usan MongoDB real y descartable.
Se cubren además las operaciones principales de productos y sus errores.
Swagger UI sirve HTML para rutas hijas; los métodos distintos de GET y HEAD ahora
devuelven el error centralizado 404. No se afirma cobertura exhaustiva de cada
combinación de campos y fallos internos de toda la especificación.

## Entrega

Subir esta carpeta a GitHub sin node_modules, .env ni logs y entregar el enlace.
.env.test contiene solo valores de prueba y sí se versiona. La creación del
repositorio y publicación no forman parte de esta copia local.

## Validación realizada el 12 de noviembre de 2026

npm test: 71 pruebas aprobadas, en dos ejecuciones consecutivas sin limpieza manual.
Entorno de verificación: Node 24.22.3, MongoDB temporal local. Para iniciarlo fue
necesario permitir la ejecución del proceso local fuera de las restricciones
iniciales del entorno de revisión.

## Cambios respecto de la base

Se agregan tests/ por recurso, .env.test, dependencias y script de Mocha, y esta
guía. Se conserva test/ como suite histórica. El logger separa los registros de
testing en logs/test y omite consola en ese entorno. Swagger restringe los
métodos de documentación a GET y HEAD; los restantes devuelven ROUTE_NOT_FOUND.
El proyecto original en D: no fue modificado.


npm run test:legacy: 5 pruebas históricas aprobadas.

