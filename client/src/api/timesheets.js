import { apiClient } from './apiClient.js'

export async function getTimesheets() {
  return apiClient('/api/timesheets')
}

export async function getTimesheet(id) {
  return apiClient(`/api/timesheets/${id}`)
}

export async function createTimesheet(body) {
  return apiClient('/api/timesheets', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateEntries(id, entries) {
  return apiClient(`/api/timesheets/${id}/entries`, {
    method: 'PUT',
    body: JSON.stringify({ entries }),
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
    body: JSON.stringify(body),
  })
}

export async function processPayment(id, body) {
  return apiClient(`/api/timesheets/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
