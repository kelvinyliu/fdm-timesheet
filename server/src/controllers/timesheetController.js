import {
  getTimesheetsByConsultant,
  getTimesheetsForManager,
  getTimesheetById,
  createTimesheet,
  updateTimesheetStatus,
  getPreviousWeekEntries,
  reviewTimesheet,
} from '../models/timesheetModel.js'
import { getEntriesByTimesheet, upsertEntries } from '../models/timesheetEntryModel.js'
import { logAction } from '../models/auditModel.js'
import { Role } from '../constants/roles.js'
import { TimesheetStatus } from '../constants/timesheetStatus.js'
import { timesheetDto, timesheetWithEntriesDto } from '../dtos/timesheetDto.js'
import { entryDto } from '../dtos/entryDto.js'

export async function listTimesheets(req, res, next) {
  try {
    let timesheets

    if (req.user.role === Role.CONSULTANT) {
      timesheets = await getTimesheetsByConsultant(req.user.userId)
    } else if (req.user.role === Role.LINE_MANAGER) {
      timesheets = await getTimesheetsForManager(req.user.userId)
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

    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required' })
    }

    if (new Date(weekStart + 'T00:00:00Z').getUTCDay() !== 1) {
      return res.status(400).json({ error: 'week_start must be a Monday' })
    }

    const timesheet = await createTimesheet({
      consultantId: req.user.userId,
      assignmentId: assignmentId ?? null,
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
    }

    const entries = await getEntriesByTimesheet(req.params.id)

    res.json(timesheetWithEntriesDto(timesheet, entries))
  } catch (err) {
    next(err)
  }
}

export async function updateEntries(req, res, next) {
  try {
    const timesheet = await getTimesheetById(req.params.id)

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' })
    }

    if (timesheet.consultant_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      return res.status(409).json({ error: 'Timesheet cannot be edited after submission' })
    }

    const { entries } = req.body

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries must be a non-empty array' })
    }

    for (const entry of entries) {
      if (
        !entry.date ||
        entry.hoursWorked === undefined ||
        entry.hoursWorked < 0 ||
        entry.hoursWorked > 24
      ) {
        return res
          .status(400)
          .json({ error: 'Each entry must have a date and hoursWorked between 0 and 24' })
      }
    }

    const updated = await upsertEntries(req.params.id, entries)

    res.json(updated.map(entryDto))
  } catch (err) {
    next(err)
  }
}

export async function submitTimesheet(req, res, next) {
  try {
    const timesheet = await getTimesheetById(req.params.id)

    if (!timesheet) {
      return res.status(404).json({ error: 'Timesheet not found' })
    }

    if (timesheet.consultant_id !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      return res.status(400).json({ error: 'Only draft timesheets can be submitted' })
    }

    const updated = await updateTimesheetStatus(req.params.id, TimesheetStatus.PENDING)

    await logAction({
      action: 'SUBMISSION',
      performedBy: req.user.userId,
      timesheetId: req.params.id,
      detail: { previousStatus: TimesheetStatus.DRAFT },
    })

    res.json(timesheetDto(updated))
  } catch (err) {
    next(err)
  }
}

export async function reviewTimesheetHandler(req, res, next) {
  try {
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

    await logAction({
      action: action === 'APPROVE' ? 'APPROVAL' : 'REJECTION',
      performedBy: req.user.userId,
      timesheetId: req.params.id,
      detail: { decision, comment: comment?.trim() ?? null },
    })

    res.json(timesheetDto(updated))
  } catch (err) {
    next(err)
  }
}

export async function autofillTimesheet(req, res, next) {
  try {
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
