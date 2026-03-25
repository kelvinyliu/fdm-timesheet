import "dotenv/config"
import app from './app.js'
import logger from './logger.js'

const PORT = process.env.PORT ?? 3000

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started')
})

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down')
  server.close(() => process.exit(0))
})
