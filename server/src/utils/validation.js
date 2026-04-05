const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export function isUuid(value) {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

export function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) return false
  const date = new Date(value + 'T00:00:00Z')
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function toUtcDate(value) {
  return new Date(value + 'T00:00:00Z')
}

