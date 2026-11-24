import { logger } from './config/logger.config.js';

// Imports dinámicos para registrar también fallas de validación del entorno.
try {
  const { config } = await import('./config/env.config.js');
  const { default: app } = await import('./app.js');
  const { connectDatabase, disconnectDatabase } = await import('./repositories/database.js');
  try {
    await connectDatabase(config.mongodbUri);
    const server = app.listen(config.port, () => {
      logger.info('Servidor ShipNow escuchando en el puerto ' + config.port);
    });
    server.on('error', async (error) => {
      logger.fatal('No se pudo abrir el servidor', { code: error.code });
      await disconnectDatabase();
      process.exitCode = 1;
    });
  } catch (error) {
    // No registrar la URI ni mensajes del driver que puedan contener credenciales.
    logger.fatal('No se pudo conectar con MongoDB', { errorName: error.name });
    await disconnectDatabase();
    process.exitCode = 1;
  }
} catch (error) {
  logger.fatal('Configuración inicial inválida', { messageDetail: error.message });
  process.exitCode = 1;
}
