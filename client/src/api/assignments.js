import { apiClient } from './apiClient.js'

export async function getAssignments(requestOptions = {}) {
  return apiClient('/api/assignments', requestOptions)
}

export async function getAllAssignments(requestOptions = {}) {
  return apiClient('/api/assignments/all', requestOptions)
}

export async function createAssignment(body) {
  return apiClient('/api/assignments', {
    method: 'POST',
    body,
  })
}

export async function deleteAssignment(id) {
  return apiClient(`/api/assignments/${id}`, {
    method: 'DELETE',
  })
}

export async function getManagerAssignments(requestOptions = {}) {
  return apiClient('/api/manager-assignments', requestOptions)
}

export async function createManagerAssignment(body) {
  return apiClient('/api/manager-assignments', {
    method: 'POST',
    body,
  })
}

export async function updateManagerAssignment(id, body) {
  return apiClient(`/api/manager-assignments/${id}`, {
    method: 'PATCH',
    body,
  })
}

export async function deleteManagerAssignment(id) {
  return apiClient(`/api/manager-assignments/${id}`, {
    method: 'DELETE',
  })
}
