import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret'
process.env.LOG_LEVEL = 'silent'

vi.mock('../models/clientAssignmentModel.js', () => ({
  getAssignmentsByConsultant: vi.fn(),
  getAllAssignments: vi.fn(),
  getAssignmentById: vi.fn(),
  createAssignment: vi.fn(),
  deleteAssignment: vi.fn(),
}))

vi.mock('../models/userModel.js', () => ({
  findUserById: vi.fn(),
}))

import app from '../app.js'
import * as clientAssignmentModel from '../models/clientAssignmentModel.js'
import * as userModel from '../models/userModel.js'

const SECRET = 'test-secret'
const CONSULTANT_ID = '11111111-1111-4111-8111-111111111111'

function token(payload) {
  return `Bearer ${jwt.sign(payload, SECRET)}`
}

const consultantToken = token({ userId: 'consultant-1', role: 'CONSULTANT' })
const managerToken = token({ userId: 'manager-1', role: 'LINE_MANAGER' })
const adminToken = token({ userId: 'admin-1', role: 'SYSTEM_ADMIN' })

const assignmentRow = {
  assignment_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  consultant_id: CONSULTANT_ID,
  client_name: 'Acme Corp',
  client_bill_rate: '750.00',
  created_at: '2025-03-24T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/assignments', () => {
  it('consultant receives their own assignments', async () => {
    clientAssignmentModel.getAssignmentsByConsultant.mockResolvedValue([assignmentRow])

    const res = await request(app)
      .get('/api/assignments')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{
      id: assignmentRow.assignment_id,
      consultantId: assignmentRow.consultant_id,
      clientName: assignmentRow.client_name,
      createdAt: assignmentRow.created_at,
    }])
    expect(clientAssignmentModel.getAssignmentsByConsultant).toHaveBeenCalledWith('consultant-1')
  })

  it('returns 403 when an admin hits the consultant endpoint', async () => {
    const res = await request(app)
      .get('/api/assignments')
      .set('Authorization', adminToken)

    expect(res.status).toBe(403)
    expect(clientAssignmentModel.getAssignmentsByConsultant).not.toHaveBeenCalled()
  })

  it('line manager receives their own assignments for self-timesheets', async () => {
    clientAssignmentModel.getAssignmentsByConsultant.mockResolvedValue([assignmentRow])

    const res = await request(app)
      .get('/api/assignments')
      .set('Authorization', managerToken)

    expect(res.status).toBe(200)
    expect(clientAssignmentModel.getAssignmentsByConsultant).toHaveBeenCalledWith('manager-1')
  })
})

describe('GET /api/assignments/all', () => {
  it('admin receives all assignments', async () => {
    clientAssignmentModel.getAllAssignments.mockResolvedValue([assignmentRow])

    const res = await request(app)
      .get('/api/assignments/all')
      .set('Authorization', adminToken)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{
      id: assignmentRow.assignment_id,
      consultantId: assignmentRow.consultant_id,
      clientName: assignmentRow.client_name,
      clientBillRate: 750,
      createdAt: assignmentRow.created_at,
    }])
    expect(clientAssignmentModel.getAllAssignments).toHaveBeenCalledTimes(1)
  })
})

describe('POST /api/assignments', () => {
  it('returns 400 when clientBillRate is missing', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', adminToken)
      .send({
        consultantId: '11111111-1111-4111-8111-111111111111',
        clientName: 'Acme Corp',
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/clientBillRate/)
  })

  it('returns 400 when clientBillRate is invalid', async () => {
    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', adminToken)
      .send({
        consultantId: '11111111-1111-4111-8111-111111111111',
        clientName: 'Acme Corp',
        clientBillRate: 0,
      })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/greater than 0/)
  })

  it('creates an assignment for a consultant', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: CONSULTANT_ID,
      role: 'CONSULTANT',
    })
    clientAssignmentModel.createAssignment.mockResolvedValue(assignmentRow)

    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', adminToken)
      .send({
        consultantId: CONSULTANT_ID,
        clientName: 'Acme Corp',
        clientBillRate: 750,
      })

    expect(res.status).toBe(201)
    expect(clientAssignmentModel.createAssignment).toHaveBeenCalledWith({
      consultantId: CONSULTANT_ID,
      clientName: 'Acme Corp',
      clientBillRate: 750,
    })
    expect(res.body.id).toBe(assignmentRow.assignment_id)
  })

  it('creates an assignment for a line manager submitter', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: CONSULTANT_ID,
      role: 'LINE_MANAGER',
    })
    clientAssignmentModel.createAssignment.mockResolvedValue(assignmentRow)

    const res = await request(app)
      .post('/api/assignments')
      .set('Authorization', adminToken)
      .send({
        consultantId: CONSULTANT_ID,
        clientName: 'Acme Corp',
        clientBillRate: 750,
      })

    expect(res.status).toBe(201)
    expect(clientAssignmentModel.createAssignment).toHaveBeenCalledWith({
      consultantId: CONSULTANT_ID,
      clientName: 'Acme Corp',
      clientBillRate: 750,
    })
  })
})

describe('DELETE /api/assignments/:id', () => {
  it('soft deletes an assignment', async () => {
    clientAssignmentModel.deleteAssignment.mockResolvedValue(true)

    const res = await request(app)
      .delete(`/api/assignments/${assignmentRow.assignment_id}`)
      .set('Authorization', adminToken)

    expect(res.status).toBe(204)
    expect(clientAssignmentModel.deleteAssignment).toHaveBeenCalledWith(assignmentRow.assignment_id)
  })

  it('returns 404 when the assignment does not exist', async () => {
    clientAssignmentModel.deleteAssignment.mockResolvedValue(false)

    const res = await request(app)
      .delete(`/api/assignments/${assignmentRow.assignment_id}`)
      .set('Authorization', adminToken)

    expect(res.status).toBe(404)
  })
})
