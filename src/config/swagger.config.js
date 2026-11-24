import { AppError } from '../utils/AppError.js';
import swaggerUi from 'swagger-ui-express';
import { readFile } from 'node:fs/promises';
export const openapi = JSON.parse(await readFile(new URL('../docs/openapi.json', import.meta.url), 'utf8'));
export function setupSwagger(app) {
  app.use('/api/docs', (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next(new AppError('ROUTE_NOT_FOUND'));
    next();
  });
  const specification = structuredClone(openapi);
  if (process.env.NODE_ENV === 'production') {
    for (const route of Object.keys(specification.paths)) {
      if (route.startsWith('/api/mocks/') || route === '/api/loggerTest') delete specification.paths[route];
    }
  }
  app.get('/api/docs/openapi.json', (req, res) => res.json(specification));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specification, {
    customSiteTitle: 'ShipNow API — Swagger',
    swaggerOptions: { persistAuthorization: false }
  }));
}

