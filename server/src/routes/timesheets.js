import { Router } from 'express'
import auth from '../middleware/auth.js'
import requireRole from '../middleware/requireRole.js'
import { Role } from '../constants/roles.js'
import {
  listTimesheets,
  listEligibleWeeks,
  createTimesheetHandler,
  getTimesheet,
  updateEntries,
  submitTimesheet,
  autofillTimesheet,
  reviewTimesheetHandler,
  processPaymentHandler,
  getNotesHandler,
} from '../controllers/timesheetController.js'

const router = Router()

router.use(auth)

router.get('/', requireRole(Role.CONSULTANT, Role.LINE_MANAGER, Role.FINANCE_MANAGER), listTimesheets)
router.get('/eligible-weeks', requireRole(Role.CONSULTANT), listEligibleWeeks)
router.post('/', requireRole(Role.CONSULTANT), createTimesheetHandler)
router.get('/:id', requireRole(Role.CONSULTANT, Role.LINE_MANAGER, Role.FINANCE_MANAGER), getTimesheet)
router.put('/:id/entries', requireRole(Role.CONSULTANT), updateEntries)
router.post('/:id/submit', requireRole(Role.CONSULTANT), submitTimesheet)
router.get('/:id/autofill', requireRole(Role.CONSULTANT), autofillTimesheet)
router.patch('/:id/review', requireRole(Role.LINE_MANAGER), reviewTimesheetHandler)
router.post('/:id/payment', requireRole(Role.FINANCE_MANAGER), processPaymentHandler)
router.get('/:id/notes', requireRole(Role.FINANCE_MANAGER), getNotesHandler)

export default router
