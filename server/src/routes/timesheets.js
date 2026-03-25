import { Router } from 'express'
import auth from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import { Role } from '../constants/roles.js'
import {
  listTimesheets,
  createTimesheetHandler,
  getTimesheet,
  updateEntries,
  submitTimesheet,
  autofillTimesheet,
  reviewTimesheetHandler,
} from '../controllers/timesheetController.js'

const router = Router()

router.use(auth)

router.get('/', requireRole(Role.CONSULTANT, Role.LINE_MANAGER), listTimesheets)
router.post('/', requireRole(Role.CONSULTANT), createTimesheetHandler)
router.get('/:id', requireRole(Role.CONSULTANT, Role.LINE_MANAGER), getTimesheet)
router.put('/:id/entries', requireRole(Role.CONSULTANT), updateEntries)
router.post('/:id/submit', requireRole(Role.CONSULTANT), submitTimesheet)
router.get('/:id/autofill', requireRole(Role.CONSULTANT), autofillTimesheet)
router.patch('/:id/review', requireRole(Role.LINE_MANAGER), reviewTimesheetHandler)

export default router
