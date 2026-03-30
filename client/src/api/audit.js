import { apiClient } from './apiClient.js'

export async function getAuditLog() {
  return apiClient('/api/audit')
}
