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
import { getAssignmentById, getAssignmentByIdIncludingDeleted } from '../models/clientAssignmentModel.js'
import { findUserById } from '../models/userModel.js'
import { getEntriesByTimesheet, getWorkSummariesByTimesheetIds, upsertEntries } from '../models/timesheetEntryModel.js'
import { logAction } from '../models/auditModel.js'
import { getPaymentByTimesheet, createPayment, createFinancialNote, getFinancialNotes } from '../models/paymentModel.js'
import { Role } from '../constants/roles.js'
import { TimesheetStatus } from '../constants/timesheetStatus.js'
import { timesheetDto, timesheetWithEntriesDto, workSummaryDto } from '../dtos/timesheetDto.js'
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

function entryKey({ date, entryKind, assignmentId }) {
  return `${date}|${entryKind}|${assignmentId ?? 'internal'}`
}

function summariseEntries(entries) {
  const summaryByKey = new Map()

  for (const entry of entries) {
    const date = entry.date ?? formatDateOnly(entry.entry_date)
    const entryKind = entry.entryKind ?? entry.entry_kind
    const assignmentId = entry.assignmentId ?? entry.assignment_id ?? null
    const bucketLabel = entry.bucketLabel ?? entry.bucket_label ?? (entryKind === 'INTERNAL' ? 'Internal' : 'Unknown client assignment')
    const hoursWorked = Number(entry.hoursWorked ?? entry.hours_worked ?? 0)
    const key = `${entryKind}|${assignmentId ?? 'internal'}`

    if (!summaryByKey.has(key)) {
      summaryByKey.set(key, {
        entry_kind: entryKind,
        assignment_id: assignmentId,
        bucket_label: bucketLabel,
        total_hours: 0,
        last_date: date,
      })
    }

    const current = summaryByKey.get(key)
    current.total_hours += hoursWorked
    current.last_date = date > current.last_date ? date : current.last_date
  }

  return [...summaryByKey.values()]
    .sort((a, b) => {
      if (a.entry_kind !== b.entry_kind) return a.entry_kind === 'INTERNAL' ? 1 : -1
      if (a.last_date !== b.last_date) return a.last_date < b.last_date ? 1 : -1
      return a.bucket_label.localeCompare(b.bucket_label)
    })
    .map(({ last_date: _lastDate, ...summary }) => summary)
}

async function buildWorkSummaryMap(timesheetIds) {
  const rows = await getWorkSummariesByTimesheetIds(timesheetIds)
  const map = new Map()

  for (const row of rows) {
    const current = map.get(row.timesheet_id) ?? []
    current.push(workSummaryDto(row))
    map.set(row.timesheet_id, current)
  }

  return map
}

async function withSuggestedRates(workSummary, consultantId) {
  const assignmentCache = new Map()
  const consultant = consultantId ? await findUserById(consultantId) : null
  const suggestedPayRate = consultant?.default_pay_rate == null
    ? null
    : parseFloat(consultant.default_pay_rate)
  const enriched = []

  for (const item of workSummary) {
    if (item.assignmentId) {
      if (!assignmentCache.has(item.assignmentId)) {
        assignmentCache.set(item.assignmentId, await getAssignmentByIdIncludingDeleted(item.assignmentId))
      }

      const assignment = assignmentCache.get(item.assignmentId)
      enriched.push({
        ...item,
        suggestedBillRate: assignment?.client_bill_rate == null ? null : parseFloat(assignment.client_bill_rate),
        suggestedPayRate,
      })
      continue
    }

    enriched.push({
      ...item,
      suggestedBillRate: 0,
      suggestedPayRate,
    })
  }

  return enriched
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
    const workSummaryMap = await buildWorkSummaryMap(timesheets.map((timesheet) => timesheet.timesheet_id))
    res.json(
      timesheets.map((timesheet) => timesheetDto(timesheet, workSummaryMap.get(timesheet.timesheet_id) ?? []))
    )
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

    if (assignmentId !== undefined && assignmentId !== null) {
      return res.status(400).json({ error: 'assignmentId is no longer set during timesheet creation' })
    }

    const timesheet = await createTimesheet({
      consultantId: req.user.userId,
      assignmentId: null,
      weekStart,
    })

    res.status(201).json(timesheetDto(timesheet, []))
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
    let workSummary = summariseEntries(entries).map(workSummaryDto)
    if (req.user.role === Role.FINANCE_MANAGER) {
      workSummary = await withSuggestedRates(workSummary, timesheet.consultant_id)
    }

    res.json(timesheetWithEntriesDto(timesheet, entries, workSummary))
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

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries must be an array' })
    }

    const weekStart = toUtcDate(formatDateValue(timesheet.week_start))
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6)
    const seenEntries = new Set()
    const hoursByDate = new Map()
    const sanitisedEntries = []
    const assignmentCache = new Map()
    const existingEntries = await getEntriesByTimesheet(req.params.id)
    const reusableArchivedAssignmentIds = new Set(
      existingEntries
        .filter((entry) => entry.entry_kind === 'CLIENT' && entry.assignment_id)
        .map((entry) => entry.assignment_id)
    )

    for (const entry of entries) {
      const entryKind = entry.entryKind
      const hoursWorked = Number(entry.hoursWorked)

      if (entryKind !== 'CLIENT' && entryKind !== 'INTERNAL') {
        return res.status(400).json({ error: 'Each entry must use entryKind CLIENT or INTERNAL' })
      }

      if (!isIsoDate(entry.date) || !Number.isFinite(hoursWorked) || hoursWorked < 0 || hoursWorked > 24) {
        return res.status(400).json({ error: 'Each entry must have a valid date and hoursWorked between 0 and 24' })
      }

      let resolvedAssignmentId = null
      if (entryKind === 'CLIENT') {
        if (!entry.assignmentId || !isUuid(entry.assignmentId)) {
          return res.status(400).json({ error: 'Client entries must include a valid assignmentId' })
        }

        if (!assignmentCache.has(entry.assignmentId)) {
          let assignment = await getAssignmentById(entry.assignmentId)

          if (!assignment && reusableArchivedAssignmentIds.has(entry.assignmentId)) {
            assignment = await getAssignmentByIdIncludingDeleted(entry.assignmentId)
          }

          assignmentCache.set(entry.assignmentId, assignment)
        }

        const assignment = assignmentCache.get(entry.assignmentId)
        if (!assignment) {
          return res.status(404).json({ error: 'Assignment not found' })
        }
        if (assignment.consultant_id !== req.user.userId) {
          return res.status(400).json({ error: 'assignmentId must belong to the authenticated consultant' })
        }

        resolvedAssignmentId = entry.assignmentId
      } else if (entry.assignmentId !== undefined && entry.assignmentId !== null && entry.assignmentId !== '') {
        return res.status(400).json({ error: 'Internal entries must not include assignmentId' })
      }

      const key = entryKey({
        date: entry.date,
        entryKind,
        assignmentId: resolvedAssignmentId,
      })

      if (seenEntries.has(key)) {
        return res.status(400).json({ error: 'entries must not include duplicate work categories for the same day' })
      }
      seenEntries.add(key)

      const entryDate = toUtcDate(entry.date)
      if (entryDate < weekStart || entryDate > weekEnd) {
        return res.status(400).json({ error: 'Entry dates must be within the timesheet week' })
      }

      const existingDayTotal = hoursByDate.get(entry.date) ?? 0
      const nextDayTotal = existingDayTotal + hoursWorked
      if (nextDayTotal > 24) {
        return res.status(400).json({ error: 'The total hours for a single day must not exceed 24' })
      }
      hoursByDate.set(entry.date, nextDayTotal)

      sanitisedEntries.push({
        date: entry.date,
        entryKind,
        assignmentId: resolvedAssignmentId,
        hoursWorked,
      })
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

    const entries = await getEntriesByTimesheet(req.params.id)
    if (entries.length === 0) {
      return res.status(400).json({ error: 'Timesheet must include at least one entry before submission' })
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

    if (timesheet.status !== TimesheetStatus.DRAFT) {
      return res.status(409).json({ error: 'Only draft timesheets can be autofilled' })
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

    const { breakdowns, notes } = req.body

    if (!Array.isArray(breakdowns) || breakdowns.length === 0) {
      return res.status(400).json({ error: 'breakdowns must be a non-empty array' })
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
    const workSummary = summariseEntries(entries)
    if (workSummary.length === 0) {
      return res.status(400).json({ error: 'Approved timesheet has no work categories to process for payment' })
    }

    const workSummaryByKey = new Map(
      workSummary.map((summary) => [
        entryKey({
          date: 'summary',
          entryKind: summary.entry_kind,
          assignmentId: summary.assignment_id ?? null,
        }),
        summary,
      ])
    )
    const seenBreakdowns = new Set()
    const normalisedBreakdowns = []

    for (const breakdown of breakdowns) {
      if (breakdown.entryKind !== 'CLIENT' && breakdown.entryKind !== 'INTERNAL') {
        return res.status(400).json({ error: 'Each breakdown must use entryKind CLIENT or INTERNAL' })
      }

      if (breakdown.entryKind === 'CLIENT' && !isUuid(breakdown.assignmentId)) {
        return res.status(400).json({ error: 'Client breakdowns must include a valid assignmentId' })
      }

      if (breakdown.entryKind === 'INTERNAL' && breakdown.assignmentId !== undefined && breakdown.assignmentId !== null && breakdown.assignmentId !== '') {
        return res.status(400).json({ error: 'Internal breakdowns must not include assignmentId' })
      }

      const key = entryKey({
        date: 'summary',
        entryKind: breakdown.entryKind,
        assignmentId: breakdown.entryKind === 'CLIENT' ? breakdown.assignmentId : null,
      })

      if (seenBreakdowns.has(key)) {
        return res.status(400).json({ error: 'breakdowns must not include duplicate work categories' })
      }
      seenBreakdowns.add(key)

      const summary = workSummaryByKey.get(key)
      if (!summary) {
        return res.status(400).json({ error: 'breakdowns must match the timesheet work categories exactly' })
      }

      const billRate = Number(breakdown.billRate ?? 0)
      if (!Number.isFinite(billRate) || billRate < 0) {
        return res.status(400).json({ error: 'Each breakdown must include a billRate of 0 or greater' })
      }

      if (summary.entry_kind === 'CLIENT' && billRate <= 0) {
        return res.status(400).json({ error: 'Client breakdowns must include a billRate greater than 0' })
      }

      if (summary.entry_kind === 'INTERNAL' && billRate !== 0) {
        return res.status(400).json({ error: 'Internal breakdowns must use a billRate of 0' })
      }

      const payRate = Number(breakdown.payRate)
      if (!Number.isFinite(payRate) || payRate <= 0) {
        return res.status(400).json({ error: 'Each breakdown must include a payRate greater than 0' })
      }

      const hoursWorked = parseFloat(summary.total_hours)
      const billAmount = parseFloat((billRate * hoursWorked).toFixed(2))
      const payAmount = parseFloat((payRate * hoursWorked).toFixed(2))
      const marginAmount = parseFloat((billAmount - payAmount).toFixed(2))

      normalisedBreakdowns.push({
        entryKind: summary.entry_kind,
        assignmentId: summary.assignment_id ?? null,
        bucketLabel: summary.bucket_label,
        hoursWorked,
        billRate,
        billAmount,
        payRate,
        payAmount,
        marginAmount,
      })
    }

    if (seenBreakdowns.size !== workSummaryByKey.size) {
      return res.status(400).json({ error: 'breakdowns must match the timesheet work categories exactly' })
    }

    const totalHours = normalisedBreakdowns.reduce((sum, breakdown) => sum + breakdown.hoursWorked, 0)
    const totalBillAmount = parseFloat(
      normalisedBreakdowns.reduce((sum, breakdown) => sum + breakdown.billAmount, 0).toFixed(2)
    )
    const totalPayAmount = parseFloat(
      normalisedBreakdowns.reduce((sum, breakdown) => sum + breakdown.payAmount, 0).toFixed(2)
    )
    const marginAmount = parseFloat((totalBillAmount - totalPayAmount).toFixed(2))
    const trimmedNotes = notes?.trim()

    const payment = await createPayment({
      timesheetId: req.params.id,
      processedBy: req.user.userId,
      totalBillAmount,
      totalPayAmount,
      marginAmount,
      breakdowns: normalisedBreakdowns,
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
      detail: {
        totalBillAmount,
        totalPayAmount,
        marginAmount,
        totalHours,
        breakdowns: normalisedBreakdowns,
      },
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
