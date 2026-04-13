import { apiClient } from './apiClient.js'

function normalizeTimesheet(timesheet) {
  if (!timesheet?.entries) return timesheet
  return {
    ...timesheet,
    entries: timesheet.entries.map((entry) => ({
      ...entry,
      id: entry.id ?? `${entry.date}-${entry.entryKind}-${entry.assignmentId ?? 'INTERNAL'}`,
    })),
  }
}

export async function getTimesheets(options = {}, requestOptions = {}) {
  const params = new URLSearchParams()
  if (options.scope) params.set('scope', options.scope)
  const query = params.toString()
  return apiClient(`/api/timesheets${query ? `?${query}` : ''}`, requestOptions)
}

export async function getEligibleWeeks(requestOptions = {}) {
  return apiClient('/api/timesheets/eligible-weeks', requestOptions)
}

export async function getTimesheet(id, requestOptions = {}) {
  const timesheet = await apiClient(`/api/timesheets/${id}`, requestOptions)
  return normalizeTimesheet(timesheet)
}

export async function createTimesheet(body) {
  return apiClient('/api/timesheets', {
    method: 'POST',
    body,
  })
}

export async function updateEntries(id, entries) {
  return apiClient(`/api/timesheets/${id}/entries`, {
    method: 'PUT',
    body: { entries },
  })
}

export async function submitTimesheet(id) {
  return apiClient(`/api/timesheets/${id}/submit`, {
    method: 'POST',
  })
}

export async function autofillTimesheet(id) {
  return apiClient(`/api/timesheets/${id}/autofill`)
}

export async function reviewTimesheet(id, body) {
  return apiClient(`/api/timesheets/${id}/review`, {
    method: 'PATCH',
    body,
  })
}

export async function processPayment(id, body) {
  return apiClient(`/api/timesheets/${id}/payment`, {
    method: 'POST',
    body,
  })
}

export async function getTimesheetNotes(id, requestOptions = {}) {
  return apiClient(`/api/timesheets/${id}/notes`, requestOptions)
}
