import { setupSwagger } from './config/swagger.config.js';
import { shippingRouter } from './routes/shipping.router.js';
import loggerRouter from './routes/logger.router.js';
import { requestLogger } from './middlewares/requestLogger.middleware.js';
import express from 'express';
import cors from 'cors';
import productsRouter from './routes/products.router.js';
import usersRouter from './routes/users.router.js';
import mocksRouter from './routes/mocks.router.js';
import { errorHandler } from './middlewares/error.middleware.js';

import { AppError } from './utils/AppError.js';

const app = express();
app.use(requestLogger);
app.use(cors());
app.use(express.json());

const environment = process.env.NODE_ENV ?? 'development';
if (environment !== 'production' || process.env.ENABLE_SWAGGER === 'true') setupSwagger(app);
app.use('/api/orders', shippingRouter('orders', 'oid'));
app.use('/api/deliveries', shippingRouter('deliveries', 'did'));

app.get('/health', (req, res) => res.json({
  status: 'success',
  message: 'ShipNow funcionando',
  environment,
  uptime: Math.floor(process.uptime()),
  timestamp: new Date().toISOString()
}));
app.use('/api/products', productsRouter);
app.use('/api/users', usersRouter);
if (environment !== 'production') {
  app.use('/api/mocks', mocksRouter);
  app.use('/api/loggerTest', loggerRouter);
}

app.use((req, res, next) => next(new AppError('ROUTE_NOT_FOUND')));
app.use(errorHandler);

export default app;

