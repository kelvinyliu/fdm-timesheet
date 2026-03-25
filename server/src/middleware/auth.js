import jwt from 'jsonwebtoken'
import logger from '../logger.js'

export default function auth(req, res, next) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    logger.warn({ method: req.method, path: req.url }, 'Request missing Bearer token')
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = header.split(' ')[1]

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch (err) {
    logger.warn({ method: req.method, path: req.url, reason: err.message }, 'JWT verification failed')
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
