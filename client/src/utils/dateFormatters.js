const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function parseUtcDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function getUtcDateParts(dateStr) {
  const date = parseUtcDate(dateStr)
  return {
    weekdayShort: WEEKDAY_SHORT[date.getUTCDay()],
    weekdayLong: WEEKDAY_LONG[date.getUTCDay()],
    day: date.getUTCDate(),
    monthShort: MONTH_SHORT[date.getUTCMonth()],
    year: date.getUTCFullYear(),
  }
}

export function formatWeekStart(dateStr) {
  const { weekdayShort, day, monthShort, year } = getUtcDateParts(dateStr)
  return `${weekdayShort}, ${day} ${monthShort} ${year}`
}

export function formatLongDate(dateStr) {
  const { day, monthShort, year } = getUtcDateParts(dateStr)
  return `${day} ${monthShort} ${year}`
}

export function formatDayName(dateStr) {
  return getUtcDateParts(dateStr).weekdayLong
}

export function formatShortUkDate(dateStr) {
  const { day } = getUtcDateParts(dateStr)
  const date = parseUtcDate(dateStr)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${String(day).padStart(2, '0')}/${month}`
}

export function addDays(dateStr, days) {
  const date = parseUtcDate(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function buildWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function getCurrentMonday() {
  const today = new Date()
  const utcYear = today.getUTCFullYear()
  const utcMonth = today.getUTCMonth()
  const utcDate = today.getUTCDate()
  const offset = (today.getUTCDay() + 6) % 7
  return new Date(Date.UTC(utcYear, utcMonth, utcDate - offset)).toISOString().slice(0, 10)
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTimestamp(isoString) {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
