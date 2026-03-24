import {
  getAssignmentsByConsultant,
  createAssignment,
  deleteAssignment,
} from '../models/clientAssignmentModel.js'

export async function listAssignments(req, res, next) {
  try {
    const assignments = await getAssignmentsByConsultant(req.user.userId)
    res.json(assignments)
  } catch (err) {
    next(err)
  }
}

export async function createAssignmentHandler(req, res, next) {
  try {
    const { consultantId, clientName, hourlyRate } = req.body

    if (!consultantId || !clientName || !hourlyRate) {
      return res.status(400).json({ error: 'consultantId, clientName and hourlyRate are required' })
    }

    if (hourlyRate <= 0) {
      return res.status(400).json({ error: 'hourlyRate must be greater than 0' })
    }

    const assignment = await createAssignment({ consultantId, clientName, hourlyRate })
    res.status(201).json(assignment)
  } catch (err) {
    next(err)
  }
}

export async function deleteAssignmentHandler(req, res, next) {
  try {
    const deleted = await deleteAssignment(req.params.id)

    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
