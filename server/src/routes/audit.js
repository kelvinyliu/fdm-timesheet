import { Router } from 'express'
import auth from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import { Role } from '../constants/roles.js'
import { listAuditLog } from '../controllers/auditController.js'

const router = Router()

router.use(auth)

router.get('/', requireRole(Role.SYSTEM_ADMIN), listAuditLog)

export default router
