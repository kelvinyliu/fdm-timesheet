import { apiClient } from './apiClient.js'

export async function getUsers() {
  return apiClient('/api/users')
}

export async function createUser(body) {
  return apiClient('/api/users', {
    method: 'POST',
    body,
  })
}

export async function updateUserRole(id, role) {
  return apiClient(`/api/users/${id}/role`, {
    method: 'PATCH',
    body: { role },
  })
}

export async function deleteUser(id) {
  return apiClient(`/api/users/${id}`, {
    method: 'DELETE',
  })
}
