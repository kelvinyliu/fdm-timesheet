import { apiClient } from './apiClient.js'

export async function loginRequest(email, password) {
  return apiClient('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function changePassword(currentPassword, newPassword) {
  return apiClient('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  })
}
