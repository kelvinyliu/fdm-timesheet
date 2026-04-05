import { apiClient } from './apiClient.js'

function normalizeTimesheet(timesheet) {
  if (!timesheet?.entries) return timesheet
  return {
    ...timesheet,
    entries: timesheet.entries.map((entry) => ({
      ...entry,
      id: entry.id ?? entry.date,
    })),
  }
}

export async function getTimesheets() {
  return apiClient('/api/timesheets')
}

export async function getTimesheet(id) {
  const timesheet = await apiClient(`/api/timesheets/${id}`)
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

export async function getTimesheetNotes(id) {
  return apiClient(`/api/timesheets/${id}/notes`)
}
