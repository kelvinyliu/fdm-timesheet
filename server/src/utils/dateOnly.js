function padDatePart(value) {
  return String(value).padStart(2, '0')
}

export function formatDateOnly(value) {
  if (typeof value === 'string') return value
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value

  // PostgreSQL DATE values are parsed as local-midnight Date objects by default.
  // Format them with local calendar fields so DST does not shift the date backward.
  const year = value.getFullYear()
  const month = padDatePart(value.getMonth() + 1)
  const day = padDatePart(value.getDate())
  return `${year}-${month}-${day}`
}
