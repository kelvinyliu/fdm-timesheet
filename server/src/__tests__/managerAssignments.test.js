import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret'
process.env.LOG_LEVEL = 'silent'

vi.mock('../models/lineManagerConsultantModel.js', () => ({
  getAllManagerAssignments: vi.fn(),
  getManagerAssignmentById: vi.fn(),
  createManagerAssignment: vi.fn(),
  updateManagerAssignment: vi.fn(),
  deleteManagerAssignment: vi.fn(),
}))

vi.mock('../models/userModel.js', () => ({
  findUserById: vi.fn(),
}))

import app from '../app.js'
import * as managerAssignmentModel from '../models/lineManagerConsultantModel.js'
import * as userModel from '../models/userModel.js'

const SECRET = 'test-secret'
const ADMIN_ID = 'admin-1'
const MANAGER_ID = '11111111-1111-4111-8111-111111111111'
const CONSULTANT_ID = '22222222-2222-4222-8222-222222222222'
const SECOND_CONSULTANT_ID = '33333333-3333-4333-8333-333333333333'
const ASSIGNMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function token(payload) {
  return `Bearer ${jwt.sign(payload, SECRET)}`
}

const adminToken = token({ userId: ADMIN_ID, role: 'SYSTEM_ADMIN' })
const consultantToken = token({ userId: CONSULTANT_ID, role: 'CONSULTANT' })

const assignmentRow = {
  id: ASSIGNMENT_ID,
  manager_id: MANAGER_ID,
  manager_name: 'Lina Manager',
  consultant_id: CONSULTANT_ID,
  consultant_name: 'Alex Consultant',
  assigned_at: '2025-03-24T10:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/manager-assignments', () => {
  it('returns hydrated assignment data on create', async () => {
    userModel.findUserById
      .mockResolvedValueOnce({ user_id: MANAGER_ID, role: 'LINE_MANAGER' })
      .mockResolvedValueOnce({ user_id: CONSULTANT_ID, role: 'CONSULTANT' })
    managerAssignmentModel.createManagerAssignment.mockResolvedValue(assignmentRow)

    const res = await request(app)
      .post('/api/manager-assignments')
      .set('Authorization', adminToken)
      .send({ managerId: MANAGER_ID, consultantId: CONSULTANT_ID })

    expect(res.status).toBe(201)
    expect(res.body).toEqual({
      id: ASSIGNMENT_ID,
      managerId: MANAGER_ID,
      managerName: 'Lina Manager',
      consultantId: CONSULTANT_ID,
      consultantName: 'Alex Consultant',
      assignedAt: assignmentRow.assigned_at,
    })
  })
})

describe('PATCH /api/manager-assignments/:id', () => {
  it('returns 400 when managerId or consultantId is missing', async () => {
    const res = await request(app)
      .patch(`/api/manager-assignments/${ASSIGNMENT_ID}`)
      .set('Authorization', adminToken)
      .send({ managerId: MANAGER_ID })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/managerId and consultantId/)
  })

  it('returns 400 when the assignment id is invalid', async () => {
    const res = await request(app)
      .patch('/api/manager-assignments/not-a-uuid')
      .set('Authorization', adminToken)
      .send({ managerId: MANAGER_ID, consultantId: CONSULTANT_ID })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Assignment id/)
  })

  it('returns 403 for non-admin users', async () => {
    const res = await request(app)
      .patch(`/api/manager-assignments/${ASSIGNMENT_ID}`)
      .set('Authorization', consultantToken)
      .send({ managerId: MANAGER_ID, consultantId: CONSULTANT_ID })

    expect(res.status).toBe(403)
  })

  it('returns 404 when the assignment does not exist', async () => {
    managerAssignmentModel.getManagerAssignmentById.mockResolvedValue(null)

    const res = await request(app)
      .patch(`/api/manager-assignments/${ASSIGNMENT_ID}`)
      .set('Authorization', adminToken)
      .send({ managerId: MANAGER_ID, consultantId: CONSULTANT_ID })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/Assignment not found/)
    expect(managerAssignmentModel.updateManagerAssignment).not.toHaveBeenCalled()
  })

  it('returns 404 when the new manager does not exist', async () => {
    managerAssignmentModel.getManagerAssignmentById.mockResolvedValue(assignmentRow)
    userModel.findUserById.mockResolvedValueOnce(null)

    const res = await request(app)
      .patch(`/api/manager-assignments/${ASSIGNMENT_ID}`)
      .set('Authorization', adminToken)
      .send({ managerId: MANAGER_ID, consultantId: CONSULTANT_ID })

    expect(res.status).toBe(404)
    expect(res.body.error).toMatch(/Manager not found/)
  })

  it('returns 400 when the new manager is not a line manager', async () => {
    managerAssignmentModel.getManagerAssignmentById.mockResolvedValue(assignmentRow)
    userModel.findUserById
      .mockResolvedValueOnce({ user_id: MANAGER_ID, role: 'CONSULTANT' })
      .mockResolvedValueOnce({ user_id: CONSULTANT_ID, role: 'CONSULTANT' })

    const res = await request(app)
      .patch(`/api/manager-assignments/${ASSIGNMENT_ID}`)
      .set('Authorization', adminToken)
      .send({ managerId: MANAGER_ID, consultantId: CONSULTANT_ID })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/LINE_MANAGER/)
  })

  it('returns 409 when the consultant is already assigned elsewhere', async () => {
    managerAssignmentModel.getManagerAssignmentById.mockResolvedValue(assignmentRow)
    userModel.findUserById
      .mockResolvedValueOnce({ user_id: MANAGER_ID, role: 'LINE_MANAGER' })
      .mockResolvedValueOnce({ user_id: SECOND_CONSULTANT_ID, role: 'CONSULTANT' })
    const err = new Error('duplicate key')
    err.code = '23505'
    managerAssignmentModel.updateManagerAssignment.mockRejectedValue(err)

    const res = await request(app)
      .patch(`/api/manager-assignments/${ASSIGNMENT_ID}`)
      .set('Authorization', adminToken)
      .send({ managerId: MANAGER_ID, consultantId: SECOND_CONSULTANT_ID })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/already assigned/)
  })

  it('returns hydrated assignment data on update', async () => {
    managerAssignmentModel.getManagerAssignmentById.mockResolvedValue(assignmentRow)
    userModel.findUserById
      .mockResolvedValueOnce({ user_id: MANAGER_ID, role: 'LINE_MANAGER' })
      .mockResolvedValueOnce({ user_id: SECOND_CONSULTANT_ID, role: 'CONSULTANT' })
    managerAssignmentModel.updateManagerAssignment.mockResolvedValue({
      ...assignmentRow,
      manager_name: 'Nina Manager',
      consultant_name: 'Bea Consultant',
      consultant_id: SECOND_CONSULTANT_ID,
    })

    const res = await request(app)
      .patch(`/api/manager-assignments/${ASSIGNMENT_ID}`)
      .set('Authorization', adminToken)
      .send({ managerId: MANAGER_ID, consultantId: SECOND_CONSULTANT_ID })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: ASSIGNMENT_ID,
      managerId: MANAGER_ID,
      managerName: 'Nina Manager',
      consultantId: SECOND_CONSULTANT_ID,
      consultantName: 'Bea Consultant',
      assignedAt: assignmentRow.assigned_at,
    })
    expect(managerAssignmentModel.updateManagerAssignment).toHaveBeenCalledWith(ASSIGNMENT_ID, {
      managerId: MANAGER_ID,
      consultantId: SECOND_CONSULTANT_ID,
    })
  })
})
