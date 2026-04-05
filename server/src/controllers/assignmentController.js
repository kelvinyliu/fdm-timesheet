import {
  getAssignmentsByConsultant,
  getAllAssignments,
  createAssignment,
  deleteAssignment,
} from '../models/clientAssignmentModel.js'
import { findUserById } from '../models/userModel.js'
import { Role } from '../constants/roles.js'
import { clientAssignmentDto } from '../dtos/clientAssignmentDto.js'
import { isUuid } from '../utils/validation.js'

export async function listAssignments(req, res, next) {
  try {
    const assignments = await getAssignmentsByConsultant(req.user.userId)
    res.json(assignments.map(clientAssignmentDto))
  } catch (err) {
    next(err)
  }
}

export async function listAllAssignments(req, res, next) {
  try {
    const assignments = await getAllAssignments()
    res.json(assignments.map(clientAssignmentDto))
  } catch (err) {
    next(err)
  }
}

export async function createAssignmentHandler(req, res, next) {
  try {
    const { consultantId, clientName, hourlyRate } = req.body

    if (!consultantId || !clientName?.trim() || hourlyRate === undefined || hourlyRate === null || hourlyRate === '') {
      return res.status(400).json({ error: 'consultantId, clientName and hourlyRate are required' })
    }

    if (!isUuid(consultantId)) {
      return res.status(400).json({ error: 'consultantId must be a valid UUID' })
    }

    const parsedHourlyRate = Number(hourlyRate)
    if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) {
      return res.status(400).json({ error: 'hourlyRate must be greater than 0' })
    }

    const consultant = await findUserById(consultantId)
    if (!consultant) {
      return res.status(404).json({ error: 'Consultant not found' })
    }
    if (consultant.role !== Role.CONSULTANT) {
      return res.status(400).json({ error: 'consultantId must belong to a CONSULTANT user' })
    }

    const assignment = await createAssignment({
      consultantId,
      clientName,
      hourlyRate: parsedHourlyRate,
    })
    res.status(201).json(clientAssignmentDto(assignment))
  } catch (err) {
    next(err)
  }
}

export async function deleteAssignmentHandler(req, res, next) {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({ error: 'Assignment id must be a valid UUID' })
    }

    const deleted = await deleteAssignment(req.params.id)

    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
