import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { once } from 'node:events';

// No leer .env ni aceptar una URI externa: esta suite solo borra su instancia descartable.
dotenv.config({ path: new URL('../.env.test', import.meta.url), override: true, quiet: true });
if (process.env.NODE_ENV !== 'test' || process.env.TEST_DB_NAME !== 'shipnow_test') {
  throw new Error('La suite requiere NODE_ENV=test y TEST_DB_NAME=shipnow_test');
}
let database;
export const mochaHooks = {
  async beforeAll() {
    this.timeout(180000);
    database = await MongoMemoryServer.create({ instance: { dbName: process.env.TEST_DB_NAME } });
    process.env.MONGODB_URI = database.getUri();
    const { connectDatabase } = await import('../src/repositories/database.js');
    await connectDatabase(process.env.MONGODB_URI);
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  },
  async beforeEach() {
    await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
  },
  async afterAll() {
    await mongoose.disconnect();
    if (database) await database.stop();
    const { logger } = await import('../src/config/logger.config.js');
    const finished = once(logger, 'finish');
    logger.end();
    await finished;
    logger.close();
  }
};
