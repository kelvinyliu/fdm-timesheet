import { Router } from 'express'
import auth from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import {
  listUsers,
  listConsultantPayRatesHandler,
  createUserHandler,
  updateRoleHandler,
  updateDefaultPayRateHandler,
  deleteUserHandler,
} from '../controllers/userController.js'
import { Role } from '../constants/roles.js'

const router = Router()

router.use(auth)

router.get('/', requireRole(Role.SYSTEM_ADMIN), listUsers)
router.get('/consultants/pay-rates', requireRole(Role.FINANCE_MANAGER, Role.SYSTEM_ADMIN), listConsultantPayRatesHandler)
router.post('/', requireRole(Role.SYSTEM_ADMIN), createUserHandler)
router.patch('/:id/role', requireRole(Role.SYSTEM_ADMIN), updateRoleHandler)
router.patch('/:id/default-pay-rate', requireRole(Role.FINANCE_MANAGER, Role.SYSTEM_ADMIN), updateDefaultPayRateHandler)
router.delete('/:id', requireRole(Role.SYSTEM_ADMIN), deleteUserHandler)

export default router
