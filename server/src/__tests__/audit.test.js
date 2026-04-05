import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret'
process.env.LOG_LEVEL = 'silent'

vi.mock('../models/auditModel.js', () => ({
  getAuditLog: vi.fn(),
}))

import app from '../app.js'
import * as auditModel from '../models/auditModel.js'

const SECRET = 'test-secret'

function token(payload) {
  return `Bearer ${jwt.sign(payload, SECRET)}`
}

const adminToken = token({ userId: 'admin-1', role: 'SYSTEM_ADMIN' })
const consultantToken = token({ userId: 'consultant-1', role: 'CONSULTANT' })

const auditRow = {
  audit_id: '11111111-1111-4111-8111-111111111111',
  action: 'PROCESSING',
  performed_by: '22222222-2222-4222-8222-222222222222',
  performed_by_name: 'Finance User',
  timesheet_id: '33333333-3333-4333-8333-333333333333',
  timesheet_consultant_name: 'Alex Consultant',
  timesheet_week_start: '2025-03-24',
  detail: { amount: 900 },
  created_at: '2025-03-28T10:30:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/audit', () => {
  it('returns 403 for non-admin users', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(403)
  })

  it('returns enriched audit log entries for admins', async () => {
    auditModel.getAuditLog.mockResolvedValue([auditRow])

    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', adminToken)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([{
      id: auditRow.audit_id,
      action: auditRow.action,
      performedBy: auditRow.performed_by,
      performedByName: auditRow.performed_by_name,
      timesheetId: auditRow.timesheet_id,
      timesheetConsultantName: auditRow.timesheet_consultant_name,
      timesheetWeekStart: '2025-03-24',
      detail: auditRow.detail,
      createdAt: auditRow.created_at,
    }])
  })

  it('returns null display fields when joined records are unavailable', async () => {
    auditModel.getAuditLog.mockResolvedValue([{
      ...auditRow,
      performed_by: null,
      performed_by_name: null,
      timesheet_id: '33333333-3333-4333-8333-333333333333',
      timesheet_consultant_name: null,
      timesheet_week_start: null,
    }])

    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', adminToken)

    expect(res.status).toBe(200)
    expect(res.body[0].performedByName).toBeNull()
    expect(res.body[0].timesheetConsultantName).toBeNull()
    expect(res.body[0].timesheetWeekStart).toBeNull()
  })
})
