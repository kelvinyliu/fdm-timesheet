import {
  getTimesheetsByConsultant,
  getTimesheetsForManager,
  getApprovedTimesheets,
  getTimesheetById,
  createTimesheet,
  updateTimesheetStatus,
  getPreviousWeekEntries,
  reviewTimesheet,
} from '../models/timesheetModel.js'
import { getAssignmentById } from '../models/clientAssignmentModel.js'
import { getEntriesByTimesheet, upsertEntries } from '../models/timesheetEntryModel.js'
import { logAction } from '../models/auditModel.js'
import { getPaymentByTimesheet, createPayment, createFinancialNote, getFinancialNotes } from '../models/paymentModel.js'
import { Role } from '../constants/roles.js'
import { TimesheetStatus } from '../constants/timesheetStatus.js'
import { timesheetDto, timesheetWithEntriesDto } from '../dtos/timesheetDto.js'
import { entryDto } from '../dtos/entryDto.js'
import { paymentDto } from '../dtos/paymentDto.js'
import { financialNoteDto } from '../dtos/financialNoteDto.js'
import logger from '../logger.js'
import { formatDateOnly } from '../utils/dateOnly.js'
import { isUuid, isIsoDate, toUtcDate } from '../utils/validation.js'

function requireUuid(res, value, fieldName) {
  if (!isUuid(value)) {
    res.status(400).json({ error: `${fieldName} must be a valid UUID` })
    return false
  }
  return true
}

function formatDateValue(value) {
  return formatDateOnly(value)
}

async function tryLogAction(payload, req) {
  try {
    await logAction(payload)
  } catch (err) {
    logger.error({
      err,
      userId: req.user?.userId,
      method: req.method,
      path: req.url,
      timesheetId: payload.timesheetId,
      action: payload.action,
    }, 'Audit log write failed')
  }
}

export async function listTimesheets(req, res, next) {
  try {
    let timesheets

    if (req.user.role === Role.CONSULTANT) {
      timesheets = await getTimesheetsByConsultant(req.user.userId)
    } else if (req.user.role === Role.LINE_MANAGER) {
      timesheets = await getTimesheetsForManager(req.user.userId)
    } else if (req.user.role === Role.FINANCE_MANAGER) {
      timesheets = await getApprovedTimesheets()
    } else {
      timesheets = []
    }
    res.json(timesheets.map(timesheetDto))
  } catch (err) {
    next(err)
  }
}

export async function createTimesheetHandler(req, res, next) {
  try {
    const { weekStart, assignmentId } = req.body

    if (!isIsoDate(weekStart)) {
      return res.status(400).json({ error: 'weekStart must be a valid date in YYYY-MM-DD format' })
    }

    if (toUtcDate(weekStart).getUTCDay() !== 1) {
      return res.status(400).json({ error: 'week_start must be a Monday' })
    }

    let resolvedAssignmentId = null
    if (assignmentId !== undefined && assignmentId !== null) {
      if (!requireUuid(res, assignmentId, 'assignmentId')) return

      const assignment = await getAssignmentById(assignmentId)
      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' })
      }
      if (assignment.consultant_id !== req.user.userId) {
        return res.status(400).json({ error: 'assignmentId must belong to the authenticated consultant' })
      }
      resolvedAssignmentId = assignmentId
    }

    const timesheet = await createTimesheet({
      consultantId: req.user.userId,
      assignmentId: resolvedAssignmentId,
      weekStart,
    })

    res.status(201).json(timesheetDto(timesheet))
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A timesheet for this week already exists' })
    }
    next(err)
  }
}

export async function getTimesheet(req, res, next) {
  try {
    if (!requireUuid(res, req.params.id, 'Timesheet id')) return

    const timesheet = await getTimesheetById(req.params.id)

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' })
    }

    if (req.user.role === Role.CONSULTANT) {
      if (timesheet.consultant_id !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    } else if (req.user.role === Role.LINE_MANAGER) {
      const managed = await getTimesheetsForManager(req.user.userId)
      const authorised = managed.some((t) => t.timesheet_id === timesheet.timesheet_id)
      if (!authorised) {
        return res.status(403).json({ error: 'Forbidden' })
      }
    } else if (req.user.role === Role.FINANCE_MANAGER) {
      // Finance can view any timesheet
    }

    const entries = await getEntriesByTimesheet(req.params.id)

    res.json(timesheetWithEntriesDto(timesheet, entries))
  } catch (err) {
    next(err)
  }
}

export async function updateEntries(req, res, next) {
  try {
    if (!requireUuid(res, req.params.id, 'Timesheet id')) return

    const timesheet = await getTimesheetById(req.params.id)

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' })
    }

    if (timesheet.consultant_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (timesheet.status !== TimesheetStatus.DRAFT && timesheet.status !== TimesheetStatus.REJECTED) {
      return res.status(409).json({ error: 'Only draft or rejected timesheets can be edited' })
    }

    const { entries } = req.body

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries must be a non-empty array' })
    }

    const weekStart = toUtcDate(formatDateValue(timesheet.week_start))
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
    const seenDates = new Set()
    const sanitisedEntries = []

    for (const entry of entries) {
      const hoursWorked = Number(entry.hoursWorked)
      if (!isIsoDate(entry.date) || !Number.isFinite(hoursWorked) || hoursWorked < 0 || hoursWorked > 24) {
        return res.status(400).json({ error: 'Each entry must have a valid date and hoursWorked between 0 and 24' })
      }

      if (seenDates.has(entry.date)) {
        return res.status(400).json({ error: 'entries must not include duplicate dates' })
      }
      seenDates.add(entry.date)

      const entryDate = toUtcDate(entry.date)
      if (entryDate < weekStart || entryDate > weekEnd) {
        return res.status(400).json({ error: 'Entry dates must be within the timesheet week' })
      }

      sanitisedEntries.push({ date: entry.date, hoursWorked })
    }

    const updated = await upsertEntries(req.params.id, sanitisedEntries)

    res.json(updated.map(entryDto))
  } catch (err) {
    next(err)
  }
}

export async function submitTimesheet(req, res, next) {
  try {
    if (!requireUuid(res, req.params.id, 'Timesheet id')) return

    const timesheet = await getTimesheetById(req.params.id)

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' })
    }

    if (timesheet.consultant_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (timesheet.status !== TimesheetStatus.DRAFT && timesheet.status !== TimesheetStatus.REJECTED) {
      return res.status(409).json({ error: 'Only draft or rejected timesheets can be submitted' })
    }

    const updated = await updateTimesheetStatus(req.params.id, TimesheetStatus.PENDING)

    await tryLogAction({
      action: 'SUBMISSION',
      performedBy: req.user.userId,
      timesheetId: req.params.id,
      detail: { previousStatus: timesheet.status },
    }, req)

    res.json(timesheetDto(updated))
  } catch (err) {
    next(err)
  }
}

export async function reviewTimesheetHandler(req, res, next) {
  try {
    if (!requireUuid(res, req.params.id, 'Timesheet id')) return

    const { action, comment } = req.body

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return res.status(400).json({ error: 'action must be APPROVE or REJECT' })
    }

    if (action === 'REJECT' && !comment?.trim()) {
      return res.status(400).json({ error: 'comment is required when rejecting' })
    }

    const timesheet = await getTimesheetById(req.params.id)

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' })
    }

    if (timesheet.status !== TimesheetStatus.PENDING) {
      return res.status(409).json({ error: 'Only pending timesheets can be reviewed' })
    }

    const managed = await getTimesheetsForManager(req.user.userId)
    const authorised = managed.some((t) => t.timesheet_id === timesheet.timesheet_id)
    if (!authorised) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const decision = action === 'APPROVE' ? TimesheetStatus.APPROVED : TimesheetStatus.REJECTED
    const updated = await reviewTimesheet(req.params.id, req.user.userId, decision, comment?.trim() ?? null)

    await tryLogAction({
      action: action === 'APPROVE' ? 'APPROVAL' : 'REJECTION',
      performedBy: req.user.userId,
      timesheetId: req.params.id,
      detail: { decision, comment: comment?.trim() ?? null },
    }, req)

    res.json(timesheetDto(updated))
  } catch (err) {
    next(err)
  }
}

export async function autofillTimesheet(req, res, next) {
  try {
    if (!requireUuid(res, req.params.id, 'Timesheet id')) return

    const timesheet = await getTimesheetById(req.params.id)

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' })
    }

    if (timesheet.consultant_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const entries = await getPreviousWeekEntries(req.user.userId, timesheet.week_start)

    res.json(entries.map(entryDto))
  } catch (err) {
    next(err)
  }
}

export async function processPaymentHandler(req, res, next) {
  try {
    if (!requireUuid(res, req.params.id, 'Timesheet id')) return

    const { hourlyRate, notes } = req.body

    const parsedHourlyRate = Number(hourlyRate)

    if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
      return res.status(400).json({ error: 'hourlyRate is required and must be greater than 0' })
    }

    const timesheet = await getTimesheetById(req.params.id)

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' })
    }

    if (timesheet.status !== TimesheetStatus.APPROVED) {
      return res.status(409).json({ error: 'Only approved timesheets can be processed for payment' })
    }

    const existingPayment = await getPaymentByTimesheet(req.params.id)
    if (existingPayment) {
      return res.status(409).json({ error: 'Payment has already been processed for this timesheet' })
    }

    const entries = await getEntriesByTimesheet(req.params.id)
    const totalHours = entries.reduce((sum, e) => sum + parseFloat(e.hours_worked), 0)
    const amount = parseFloat((parsedHourlyRate * totalHours).toFixed(2))
    const trimmedNotes = notes?.trim()

    const payment = await createPayment({
      timesheetId: req.params.id,
      processedBy: req.user.userId,
      hourlyRate: parsedHourlyRate,
      amount,
    })

    if (trimmedNotes) {
      try {
        await createFinancialNote({
          timesheetId: req.params.id,
          authoredBy: req.user.userId,
          note: trimmedNotes,
        })
      } catch (err) {
        logger.error({
          err,
          userId: req.user?.userId,
          method: req.method,
          path: req.url,
          timesheetId: req.params.id,
        }, 'Financial note write failed after payment processing')
      }
    }

    await tryLogAction({
      action: 'PROCESSING',
      performedBy: req.user.userId,
      timesheetId: req.params.id,
      detail: { hourlyRate: parsedHourlyRate, amount, totalHours },
    }, req)

    res.json(paymentDto(payment))
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Payment has already been processed for this timesheet' })
    }
    next(err)
  }
}

export async function getNotesHandler(req, res, next) {
  try {
    if (!requireUuid(res, req.params.id, 'Timesheet id')) return

    const timesheet = await getTimesheetById(req.params.id)
    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' })

    const notes = await getFinancialNotes(req.params.id)
    res.json(notes.map(financialNoteDto))
  } catch (err) {
    next(err)
  }
}
