import { getTimesheetStatusDisplayLabel } from '../../../utils/displayLabels.js'

export const MANAGER_STATUS_FILTERS = {
  ALL: 'ALL',
  PENDING: 'PENDING',
  APPROVED_GROUP: 'APPROVED_GROUP',
  REJECTED: 'REJECTED',
  PAID: 'COMPLETED',
}

const LEGACY_STATUS_ALIASES = {
  APPROVED: MANAGER_STATUS_FILTERS.APPROVED_GROUP,
}

function getCanonicalStatusQueryValue(statusFilter) {
  switch (statusFilter) {
    case MANAGER_STATUS_FILTERS.PENDING:
      return 'PENDING'
    case MANAGER_STATUS_FILTERS.APPROVED_GROUP:
      return 'APPROVED_GROUP'
    case MANAGER_STATUS_FILTERS.REJECTED:
      return 'REJECTED'
    case MANAGER_STATUS_FILTERS.PAID:
      return 'COMPLETED'
    default:
      return null
  }
}

export function getManagerStatusFilterFromSearch(search) {
  const rawStatus = new URLSearchParams(search).get('status')

  if (!rawStatus) return MANAGER_STATUS_FILTERS.ALL
  if (Object.values(MANAGER_STATUS_FILTERS).includes(rawStatus)) return rawStatus

  return LEGACY_STATUS_ALIASES[rawStatus] ?? MANAGER_STATUS_FILTERS.ALL
}

export function buildManagerTimesheetListPath(
  statusFilter = MANAGER_STATUS_FILTERS.ALL,
  searchQuery = ''
) {
  const params = new URLSearchParams()
  const status = getCanonicalStatusQueryValue(statusFilter)

  if (status) {
    params.set('status', status)
  }
  if (searchQuery !== '') {
    params.set('q', searchQuery)
  }

  const search = params.toString()
  return search ? `/manager/timesheets?${search}` : '/manager/timesheets'
}

export function matchesManagerStatusFilter(timesheetStatus, statusFilter) {
  if (timesheetStatus === 'DRAFT') return false

  if (statusFilter === MANAGER_STATUS_FILTERS.ALL) return true
  if (statusFilter === MANAGER_STATUS_FILTERS.PENDING) {
    return timesheetStatus === 'PENDING' || timesheetStatus === 'FINANCE_REJECTED'
  }
  if (statusFilter === MANAGER_STATUS_FILTERS.APPROVED_GROUP) {
    return timesheetStatus === 'APPROVED' || timesheetStatus === 'COMPLETED'
  }

  return timesheetStatus === statusFilter
}

export function getManagerStatusFilterLabel(statusFilter) {
  if (statusFilter === MANAGER_STATUS_FILTERS.APPROVED_GROUP) {
    return 'Approved'
  }

  return getTimesheetStatusDisplayLabel(statusFilter)
}
