import { formatDateOnly } from './dateOnly.js'

const DAYS_PER_WEEK = 7
const PAST_WEEK_WINDOW = 4

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function toUtcDate(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth(),
      value.getUTCDate()
    ))
  }

  const date = new Date(value)
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ))
}

function formatUtcDate(date) {
  return `${date.getUTCFullYear()}-${padDatePart(date.getUTCMonth() + 1)}-${padDatePart(date.getUTCDate())}`
}

export function addUtcDays(dateStr, days) {
  const date = toUtcDate(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return formatUtcDate(date)
}

export function getCurrentUtcMonday(now = new Date()) {
  const date = toUtcDate(now)
  const offset = (date.getUTCDay() + 6) % DAYS_PER_WEEK
  date.setUTCDate(date.getUTCDate() - offset)
  return formatUtcDate(date)
}

export function getUtcMondayForValue(value) {
  const date = toUtcDate(value)
  const offset = (date.getUTCDay() + 6) % DAYS_PER_WEEK
  date.setUTCDate(date.getUTCDate() - offset)
  return formatUtcDate(date)
}

export function getCreatableTimesheetWeeks({
  existingWeekStarts = [],
  userCreatedAt,
  now = new Date(),
  pastWeekWindow = PAST_WEEK_WINDOW,
} = {}) {
  const currentWeekStart = getCurrentUtcMonday(now)
  const earliestWindowWeekStart = addUtcDays(currentWeekStart, -pastWeekWindow * DAYS_PER_WEEK)
  const accountCreatedWeekStart = userCreatedAt
    ? getUtcMondayForValue(userCreatedAt)
    : earliestWindowWeekStart
  const earliestEligibleWeekStart = accountCreatedWeekStart > earliestWindowWeekStart
    ? accountCreatedWeekStart
    : earliestWindowWeekStart
  const existingWeekStartSet = new Set(existingWeekStarts.map((value) => formatDateOnly(value)))
  const creatableWeekStarts = []
  const missingPastWeekStarts = []

  if (currentWeekStart >= earliestEligibleWeekStart && !existingWeekStartSet.has(currentWeekStart)) {
    creatableWeekStarts.push(currentWeekStart)
  }

  for (let weekOffset = 1; weekOffset <= pastWeekWindow; weekOffset += 1) {
    const weekStart = addUtcDays(currentWeekStart, -weekOffset * DAYS_PER_WEEK)
    if (weekStart < earliestEligibleWeekStart || existingWeekStartSet.has(weekStart)) continue

    missingPastWeekStarts.push(weekStart)
    creatableWeekStarts.push(weekStart)
  }

  return {
    currentWeekStart,
    missingPastWeekStarts,
    creatableWeekStarts,
    earliestWindowWeekStart,
    accountCreatedWeekStart,
    earliestEligibleWeekStart,
    existingWeekStartSet,
  }
}
