import logger from '../logger.js'

export default function errorHandler(err, req, res, _next) {
  const status = err.status ?? 500
  const message = status >= 500 ? 'Internal server error' : (err.message ?? 'Request failed')

  if (status >= 500) {
    logger.error({
      err,
      userId: req.user?.userId,
      method: req.method,
      path: req.url,
    }, 'Unhandled server error')
  }

  res.status(status).json({ error: message })
}
