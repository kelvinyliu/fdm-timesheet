import { Router } from 'express'
import auth from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import {
  listManagerAssignments,
  createManagerAssignmentHandler,
  updateManagerAssignmentHandler,
  deleteManagerAssignmentHandler,
} from '../controllers/managerAssignmentController.js'
import { Role } from '../constants/roles.js'

const router = Router()

router.use(auth, requireRole(Role.SYSTEM_ADMIN))

router.get('/', listManagerAssignments)
router.post('/', createManagerAssignmentHandler)
router.patch('/:id', updateManagerAssignmentHandler)
router.delete('/:id', deleteManagerAssignmentHandler)

export default router
