import { redirect } from 'react-router'
import { getAllAssignments, getAssignments, getManagerAssignments } from '../api/assignments.js'
import { getAuditLog } from '../api/audit.js'
import {
  getEligibleWeeks,
  getTimesheet,
  getTimesheetNotes,
  getTimesheets,
} from '../api/timesheets.js'
import { getSubmitterPayRates, getUsers } from '../api/users.js'
import { getCurrentMonday } from '../utils/dateFormatters.js'
import {
  getMostRecentClientAssignmentId,
  getTimesheetForWeek,
  isConsultantEditableStatus,
} from '../utils/timesheetWorkflow.js'

const EMPTY_ELIGIBILITY = {
  currentWeekStart: getCurrentMonday(),
  missingPastWeekStarts: [],
}

function getErrorMessage(err, fallback) {
  return err?.message ?? fallback
}

export function createTimesheetListLoader({ timesheetScope } = {}) {
  return async function timesheetListLoader({ request }) {
    const [timesheetResult, eligibilityResult] = await Promise.allSettled([
      getTimesheets({ scope: timesheetScope }, { signal: request.signal }),
      getEligibleWeeks({ signal: request.signal }),
    ])

    return {
      timesheets: timesheetResult.status === 'fulfilled' ? timesheetResult.value : [],
      eligibility: eligibilityResult.status === 'fulfilled' ? eligibilityResult.value : EMPTY_ELIGIBILITY,
      error: timesheetResult.status === 'rejected'
        ? getErrorMessage(timesheetResult.reason, 'Failed to load timesheets')
        : null,
      eligibilityError: eligibilityResult.status === 'rejected'
        ? 'Missing-week creation is temporarily unavailable.'
        : null,
    }
  }
}

export function createTimesheetCreateLoader({
  basePath = '/consultant/timesheets',
  timesheetScope,
} = {}) {
  return async function timesheetCreateLoader({ request }) {
    const weekStart = getCurrentMonday()

    try {
      const allTimesheets = await getTimesheets({ scope: timesheetScope }, { signal: request.signal })
      const currentWeekTimesheet = getTimesheetForWeek(allTimesheets, weekStart)

      if (currentWeekTimesheet) {
        const destination = isConsultantEditableStatus(currentWeekTimesheet.status)
          ? `${basePath}/${currentWeekTimesheet.id}/edit`
          : `${basePath}/${currentWeekTimesheet.id}`
        return redirect(destination)
      }

      return { weekStart, error: null }
    } catch {
      return { weekStart, error: null }
    }
  }
}

export function createTimesheetEditLoader({
  basePath = '/consultant/timesheets',
  timesheetScope,
} = {}) {
  return async function timesheetEditLoader({ params, request }) {
    try {
      const [timesheet, assignments, allTimesheets] = await Promise.all([
        getTimesheet(params.id, { signal: request.signal }),
        getAssignments({ signal: request.signal }),
        getTimesheets({ scope: timesheetScope }, { signal: request.signal }),
      ])

      if (!isConsultantEditableStatus(timesheet.status)) {
        return redirect(`${basePath}/${params.id}`)
      }

      return {
        timesheet,
        assignments,
        preferredAssignmentId: getMostRecentClientAssignmentId(allTimesheets, params.id),
        error: null,
      }
    } catch (err) {
      return {
        timesheet: null,
        assignments: [],
        preferredAssignmentId: null,
        error: getErrorMessage(err, 'Failed to load timesheet'),
      }
    }
  }
}

export async function managerTimesheetListLoader({ request }) {
  try {
    return {
      timesheets: await getTimesheets({}, { signal: request.signal }),
      error: null,
    }
  } catch (err) {
    return {
      timesheets: [],
      error: getErrorMessage(err, 'Failed to load timesheets'),
    }
  }
}

export async function financeTimesheetListLoader({ request }) {
  try {
    const timesheets = await getTimesheets({}, { signal: request.signal })
    return {
      timesheets: timesheets.filter((item) => item.status === 'APPROVED' || item.status === 'COMPLETED'),
      error: null,
    }
  } catch (err) {
    return {
      timesheets: [],
      error: getErrorMessage(err, 'Failed to load timesheets'),
    }
  }
}

export async function financePayRatesLoader({ request }) {
  try {
    return {
      consultants: await getSubmitterPayRates({ signal: request.signal }),
      error: '',
    }
  } catch (err) {
    return {
      consultants: [],
      error: getErrorMessage(err, 'Failed to load submitter pay rates.'),
    }
  }
}

export async function userManagementLoader({ request }) {
  try {
    return {
      users: await getUsers({ signal: request.signal }),
      error: '',
    }
  } catch (err) {
    return {
      users: [],
      error: getErrorMessage(err, 'Failed to load users.'),
    }
  }
}

export async function assignmentsLoader({ request }) {
  const [clientResult, managerResult, usersResult] = await Promise.allSettled([
    getAllAssignments({ signal: request.signal }),
    getManagerAssignments({ signal: request.signal }),
    getUsers({ signal: request.signal }),
  ])

  return {
    clientAssignments: clientResult.status === 'fulfilled' ? clientResult.value : [],
    managerAssignments: managerResult.status === 'fulfilled' ? managerResult.value : [],
    users: usersResult.status === 'fulfilled' ? usersResult.value : [],
    clientError: clientResult.status === 'rejected'
      ? getErrorMessage(clientResult.reason, 'Failed to load client assignments.')
      : '',
    managerError: managerResult.status === 'rejected'
      ? getErrorMessage(managerResult.reason, 'Failed to load manager assignments.')
      : '',
  }
}

export async function auditLogLoader({ request }) {
  try {
    const entries = await getAuditLog({ signal: request.signal })
    return {
      entries: [...entries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
      error: '',
    }
  } catch (err) {
    return {
      entries: [],
      error: getErrorMessage(err, 'Failed to load audit log.'),
    }
  }
}

export async function timesheetDetailLoader({ params, request }) {
  try {
    const timesheet = await getTimesheet(params.id, { signal: request.signal })
    return { timesheet, error: null }
  } catch (err) {
    return { timesheet: null, error: err.message ?? 'Failed to load timesheet' }
  }
}

export async function timesheetReviewLoader({ params, request }) {
  try {
    const [timesheet, allTimesheets] = await Promise.all([
      getTimesheet(params.id, { signal: request.signal }),
      getTimesheets({}, { signal: request.signal }),
    ])

    return {
      timesheet,
      pendingQueue: allTimesheets.filter((item) => item.status === 'PENDING'),
      error: null,
    }
  } catch (err) {
    return {
      timesheet: null,
      pendingQueue: [],
      error: err.message ?? 'Failed to load timesheet',
    }
  }
}

export async function financePaymentLoader({ params, request }) {
  try {
    const [timesheet, allTimesheets] = await Promise.all([
      getTimesheet(params.id, { signal: request.signal }),
      getTimesheets({}, { signal: request.signal }),
    ])
    const fetchedNotes = timesheet.status === 'COMPLETED'
      ? await getTimesheetNotes(params.id, { signal: request.signal }).catch(() => [])
      : []

    return {
      timesheet,
      approvedQueue: allTimesheets.filter((item) => item.status === 'APPROVED'),
      fetchedNotes,
      error: null,
    }
  } catch (err) {
    return {
      timesheet: null,
      approvedQueue: [],
      fetchedNotes: [],
      error: err.message ?? 'Failed to load timesheet',
    }
  }
}
