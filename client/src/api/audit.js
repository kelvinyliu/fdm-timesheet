import { apiClient } from './apiClient.js'

export async function getAuditLog(requestOptions = {}) {
  return apiClient('/api/audit', requestOptions)
}
