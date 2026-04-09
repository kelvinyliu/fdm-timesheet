import { buildWeekDates } from './dateFormatters.js'

const CONSULTANT_EDITABLE_STATUSES = new Set(['DRAFT', 'REJECTED'])

function getUtcWeekdayIndex(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

export function isConsultantEditableStatus(status) {
  return CONSULTANT_EDITABLE_STATUSES.has(status)
}

export function getTimesheetForWeek(timesheets, weekStart) {
  return timesheets.find((timesheet) => timesheet.weekStart === weekStart) ?? null
}

export function buildAutofillEntries(weekStart, previousEntries = []) {
  const entriesByWeekday = new Map()

  for (const entry of previousEntries) {
    if (!entry?.date) continue
    const hoursWorked = Number(entry.hoursWorked)
    if (!Number.isFinite(hoursWorked)) continue

    const weekday = getUtcWeekdayIndex(entry.date)
    const current = entriesByWeekday.get(weekday) ?? []
    current.push({
      entryKind: entry.entryKind,
      assignmentId: entry.assignmentId ?? null,
      hoursWorked,
    })
    entriesByWeekday.set(weekday, current)
  }

  return buildWeekDates(weekStart).flatMap((date) =>
    (entriesByWeekday.get(getUtcWeekdayIndex(date)) ?? []).map((entry) => ({
      date,
      entryKind: entry.entryKind,
      assignmentId: entry.assignmentId,
      hoursWorked: entry.hoursWorked,
    }))
  )
}

export function getMostRecentClientAssignmentId(timesheets = [], currentTimesheetId = null) {
  const ordered = [...timesheets]
    .filter((timesheet) => timesheet.id !== currentTimesheetId)
    .sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart))

  for (const timesheet of ordered) {
    const match = (timesheet.workSummary ?? []).find((item) => item.entryKind === 'CLIENT' && item.assignmentId)
    if (match?.assignmentId) return match.assignmentId
  }

  return null
}
