import logger from '../logger.js'

export default function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn({
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: roles,
        method: req.method,
        path: req.url,
      }, 'Role authorisation denied')
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
