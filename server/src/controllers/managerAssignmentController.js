import {
  getAllManagerAssignments,
  createManagerAssignment,
  getManagerAssignmentById,
  getManagerAssignmentByConsultantId,
  deleteManagerAssignment,
  updateManagerAssignment,
} from '../models/lineManagerConsultantModel.js'
import { getTimesheetById } from '../models/timesheetModel.js'
import { managerAssignmentDto } from '../dtos/managerAssignmentDto.js'
import { findUserById } from '../models/userModel.js'
import { Role, TIMESHEET_SUBMITTER_ROLES } from '../constants/roles.js'
import { isUuid, normaliseUuid, sameUuid } from '../utils/validation.js'

function buildManagerLookupResponse(manager, source) {
  return {
    manager: manager
      ? {
          id: manager.manager_id,
          name: manager.manager_name,
          email: manager.manager_email,
        }
      : null,
    source,
  }
}

function hasSubmittedManagerSnapshot(timesheet) {
  return Boolean(
    timesheet?.submitted_manager_id ||
      timesheet?.submitted_manager_name ||
      timesheet?.submitted_manager_email
  )
}

export async function listManagerAssignments(req, res, next) {
  try {
    const assignments = await getAllManagerAssignments()
    res.json(assignments.map(managerAssignmentDto))
  } catch (err) {
    next(err)
  }
}

export async function getOwnManagerAssignmentHandler(req, res, next) {
  try {
    const { timesheetId } = req.query

    if (timesheetId !== undefined) {
      if (!isUuid(timesheetId)) {
        return res.status(400).json({ error: 'timesheetId must be a valid UUID' })
      }

      const timesheet = await getTimesheetById(timesheetId)
      if (!timesheet) {
        return res.status(404).json({ error: 'Timesheet not found' })
      }

      if (!sameUuid(timesheet.consultant_id, req.user.userId)) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      if (hasSubmittedManagerSnapshot(timesheet)) {
        return res.json(
          buildManagerLookupResponse(
            {
              manager_id: timesheet.submitted_manager_id,
              manager_name: timesheet.submitted_manager_name,
              manager_email: timesheet.submitted_manager_email,
            },
            'snapshot'
          )
        )
      }

      const currentManager = await getManagerAssignmentByConsultantId(req.user.userId)
      if (!currentManager) {
        return res.json(buildManagerLookupResponse(null, 'unassigned'))
      }

      return res.json(
        buildManagerLookupResponse(
          currentManager,
          timesheet.submitted_at ? 'legacy_fallback' : 'current'
        )
      )
    }

    const currentManager = await getManagerAssignmentByConsultantId(req.user.userId)
    if (!currentManager) {
      return res.json(buildManagerLookupResponse(null, 'unassigned'))
    }

    res.json(buildManagerLookupResponse(currentManager, 'current'))
  } catch (err) {
    next(err)
  }
}

export async function createManagerAssignmentHandler(req, res, next) {
  try {
    const { managerId, consultantId } = req.body

    if (!managerId || !consultantId) {
      return res.status(400).json({ error: 'managerId and consultantId are required' })
    }

    if (!isUuid(managerId) || !isUuid(consultantId)) {
      return res.status(400).json({ error: 'managerId and consultantId must be valid UUIDs' })
    }

    const normalisedManagerId = normaliseUuid(managerId)
    const normalisedConsultantId = normaliseUuid(consultantId)

    if (sameUuid(normalisedManagerId, normalisedConsultantId)) {
      return res.status(400).json({ error: 'A manager cannot approve their own timesheets' })
    }

    const [manager, consultant] = await Promise.all([
      findUserById(normalisedManagerId),
      findUserById(normalisedConsultantId),
    ])

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' })
    }
    if (!consultant) {
      return res.status(404).json({ error: 'Submitter not found' })
    }
    if (manager.role !== Role.LINE_MANAGER) {
      return res.status(400).json({ error: 'managerId must belong to a LINE_MANAGER user' })
    }
    if (!TIMESHEET_SUBMITTER_ROLES.has(consultant.role)) {
      return res.status(400).json({ error: 'consultantId must belong to a CONSULTANT or LINE_MANAGER user' })
    }

    const assignment = await createManagerAssignment({
      managerId: normalisedManagerId,
      consultantId: normalisedConsultantId,
    })
    res.status(201).json(managerAssignmentDto(assignment))
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Submitter is already assigned to a manager' })
    }
    next(err)
  }
}

export async function updateManagerAssignmentHandler(req, res, next) {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Assignment id must be a valid UUID' })
    }

    const { managerId, consultantId } = req.body

    if (!managerId || !consultantId) {
      return res.status(400).json({ error: 'managerId and consultantId are required' })
    }

    if (!isUuid(managerId) || !isUuid(consultantId)) {
      return res.status(400).json({ error: 'managerId and consultantId must be valid UUIDs' })
    }

    const normalisedManagerId = normaliseUuid(managerId)
    const normalisedConsultantId = normaliseUuid(consultantId)

    if (sameUuid(normalisedManagerId, normalisedConsultantId)) {
      return res.status(400).json({ error: 'A manager cannot approve their own timesheets' })
    }

    const existingAssignment = await getManagerAssignmentById(req.params.id)
    if (!existingAssignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    const [manager, consultant] = await Promise.all([
      findUserById(normalisedManagerId),
      findUserById(normalisedConsultantId),
    ])

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' })
    }
    if (!consultant) {
      return res.status(404).json({ error: 'Submitter not found' })
    }
    if (manager.role !== Role.LINE_MANAGER) {
      return res.status(400).json({ error: 'managerId must belong to a LINE_MANAGER user' })
    }
    if (!TIMESHEET_SUBMITTER_ROLES.has(consultant.role)) {
      return res.status(400).json({ error: 'consultantId must belong to a CONSULTANT or LINE_MANAGER user' })
    }

    const updatedAssignment = await updateManagerAssignment(req.params.id, {
      managerId: normalisedManagerId,
      consultantId: normalisedConsultantId,
    })
    if (!updatedAssignment) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    res.json(managerAssignmentDto(updatedAssignment))
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Submitter is already assigned to a manager' })
    }
    next(err)
  }
}

export async function deleteManagerAssignmentHandler(req, res, next) {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Assignment id must be a valid UUID' })
    }

    const deleted = await deleteManagerAssignment(req.params.id)

    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
