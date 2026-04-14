import { apiClient } from './apiClient.js'

export async function getUsers(requestOptions = {}) {
  return apiClient('/api/users', requestOptions)
}

export async function getConsultantPayRates(requestOptions = {}) {
  return apiClient('/api/users/consultants/pay-rates', requestOptions)
}

export async function getSubmitterPayRates(requestOptions = {}) {
  return apiClient('/api/users/submitters/pay-rates', requestOptions)
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

export async function updateDefaultPayRate(id, defaultPayRate) {
  return apiClient(`/api/users/${id}/default-pay-rate`, {
    method: 'PATCH',
    body: { defaultPayRate },
  })
}
