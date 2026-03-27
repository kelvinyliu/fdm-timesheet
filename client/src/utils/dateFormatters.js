export function formatWeekStart(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getCurrentMonday() {
  const today = new Date()
  const offset = (today.getUTCDay() + 6) % 7
  today.setUTCHours(0, 0, 0, 0)
  today.setUTCDate(today.getUTCDate() - offset)
  return today.toISOString().slice(0, 10)
}
