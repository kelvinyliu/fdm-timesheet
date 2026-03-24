import { Router } from 'express'
import auth from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import { listAssignments, createAssignmentHandler, deleteAssignmentHandler } from '../controllers/assignmentController.js'
import { Role } from '../constants/roles.js'

const router = Router()

router.get('/', auth, requireRole(Role.CONSULTANT), listAssignments)
router.post('/', auth, requireRole(Role.SYSTEM_ADMIN), createAssignmentHandler)
router.delete('/:id', auth, requireRole(Role.SYSTEM_ADMIN), deleteAssignmentHandler)

export default router
