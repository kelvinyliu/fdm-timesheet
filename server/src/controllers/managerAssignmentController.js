import {
  getAllManagerAssignments,
  createManagerAssignment,
  deleteManagerAssignment,
} from '../models/lineManagerConsultantModel.js'
import { managerAssignmentDto } from '../dtos/managerAssignmentDto.js'
import { findUserById } from '../models/userModel.js'
import { Role } from '../constants/roles.js'
import { isUuid } from '../utils/validation.js'

export async function listManagerAssignments(req, res, next) {
  try {
    const assignments = await getAllManagerAssignments()
    res.json(assignments.map(managerAssignmentDto))
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

    const [manager, consultant] = await Promise.all([
      findUserById(managerId),
      findUserById(consultantId),
    ])

    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' })
    }
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' })
    }
    if (manager.role !== Role.LINE_MANAGER) {
      return res.status(400).json({ error: 'managerId must belong to a LINE_MANAGER user' })
    }
    if (consultant.role !== Role.CONSULTANT) {
      return res.status(400).json({ error: 'consultantId must belong to a CONSULTANT user' })
    }

    const assignment = await createManagerAssignment({ managerId, consultantId })
    res.status(201).json(managerAssignmentDto(assignment))
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Consultant is already assigned to a manager' })
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
