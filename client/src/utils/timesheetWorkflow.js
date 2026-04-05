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
  const hoursByWeekday = new Map()

  for (const entry of previousEntries) {
    if (!entry?.date) continue
    const hoursWorked = Number(entry.hoursWorked)
    if (!Number.isFinite(hoursWorked)) continue
    hoursByWeekday.set(getUtcWeekdayIndex(entry.date), hoursWorked)
  }

  return buildWeekDates(weekStart).map((date) => ({
    date,
    hoursWorked: hoursByWeekday.get(getUtcWeekdayIndex(date)) ?? 0,
  }))
}

export function buildAutofillHours(weekStart, previousEntries = []) {
  return buildAutofillEntries(weekStart, previousEntries).map((entry) => String(entry.hoursWorked))
}
