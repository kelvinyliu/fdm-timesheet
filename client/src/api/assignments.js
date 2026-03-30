import { apiClient } from './apiClient.js'

export async function getAssignments() {
  return apiClient('/api/assignments')
}

export async function createAssignment(body) {
  return apiClient('/api/assignments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteAssignment(id) {
  return apiClient(`/api/assignments/${id}`, {
    method: 'DELETE',
  })
}

export async function getManagerAssignments() {
  return apiClient('/api/manager-assignments')
}

export async function createManagerAssignment(body) {
  return apiClient('/api/manager-assignments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function deleteManagerAssignment(id) {
  return apiClient(`/api/manager-assignments/${id}`, {
    method: 'DELETE',
  })
}
