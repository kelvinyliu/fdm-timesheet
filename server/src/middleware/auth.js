import jwt from 'jsonwebtoken'
import logger from '../logger.js'
import { findUserById } from '../models/userModel.js'

export default async function auth(req, res, next) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    logger.warn({ method: req.method, path: req.url }, 'Request missing Bearer token')
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = header.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await findUserById(payload.userId)

    if (!user) {
      logger.warn({ method: req.method, path: req.url, userId: payload.userId }, 'Authenticated user not found')
      return res.status(401).json({ error: 'Authenticated user no longer exists' })
    }

    req.user = payload
    next()
  } catch (err) {
    logger.warn({ method: req.method, path: req.url, reason: err.message }, 'JWT verification failed')
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
