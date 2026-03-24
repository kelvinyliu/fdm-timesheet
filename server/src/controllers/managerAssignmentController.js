import {
  getAllManagerAssignments,
  createManagerAssignment,
  deleteManagerAssignment,
} from '../models/lineManagerConsultantModel.js'

export async function listManagerAssignments(req, res, next) {
  try {
    const assignments = await getAllManagerAssignments()
    res.json(assignments)
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

    const assignment = await createManagerAssignment({ managerId, consultantId })
    res.status(201).json(assignment)
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Consultant is already assigned to a manager' })
    }
    next(err)
  }
}

export async function deleteManagerAssignmentHandler(req, res, next) {
  try {
    const deleted = await deleteManagerAssignment(req.params.id)

    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' })
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
