import { Router } from 'express'
import auth from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import { listUsers, createUserHandler, updateRoleHandler, deleteUserHandler } from '../controllers/userController.js'
import { Role } from '../constants/roles.js'

const router = Router()

router.use(auth, requireRole(Role.SYSTEM_ADMIN))

router.get('/', listUsers)
router.post('/', createUserHandler)
router.patch('/:id/role', updateRoleHandler)
router.delete('/:id', deleteUserHandler)

export default router
