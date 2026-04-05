import { Router } from 'express'
import auth from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import {
  listAssignments,
  listAllAssignments,
  createAssignmentHandler,
  deleteAssignmentHandler,
} from '../controllers/assignmentController.js'
import { Role } from '../constants/roles.js'

const router = Router()

router.get('/all', auth, requireRole(Role.SYSTEM_ADMIN), listAllAssignments)
router.get('/', auth, requireRole(Role.CONSULTANT), listAssignments)
router.post('/', auth, requireRole(Role.SYSTEM_ADMIN), createAssignmentHandler)
router.delete('/:id', auth, requireRole(Role.SYSTEM_ADMIN), deleteAssignmentHandler)

export default router
