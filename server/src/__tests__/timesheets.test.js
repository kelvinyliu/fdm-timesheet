import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret'
process.env.LOG_LEVEL = 'silent'

vi.mock('../models/timesheetModel.js', () => ({
  getTimesheetsByConsultant: vi.fn(),
  getTimesheetsForManager: vi.fn(),
  getApprovedTimesheets: vi.fn(),
  getTimesheetById: vi.fn(),
  createTimesheet: vi.fn(),
  updateTimesheetStatus: vi.fn(),
  getPreviousWeekEntries: vi.fn(),
  reviewTimesheet: vi.fn(),
}))

vi.mock('../models/timesheetEntryModel.js', () => ({
  getEntriesByTimesheet: vi.fn(),
  getWorkSummariesByTimesheetIds: vi.fn(),
  upsertEntries: vi.fn(),
}))

vi.mock('../models/clientAssignmentModel.js', () => ({
  getAssignmentById: vi.fn(),
}))

vi.mock('../models/auditModel.js', () => ({
  logAction: vi.fn(),
}))

vi.mock('../models/paymentModel.js', () => ({
  getPaymentByTimesheet: vi.fn(),
  createPayment: vi.fn(),
  createFinancialNote: vi.fn(),
  getFinancialNotes: vi.fn(),
}))

import app from '../app.js'
import * as timesheetModel from '../models/timesheetModel.js'
import * as entryModel from '../models/timesheetEntryModel.js'
import * as clientAssignmentModel from '../models/clientAssignmentModel.js'
import * as auditModel from '../models/auditModel.js'
import * as paymentModel from '../models/paymentModel.js'

const SECRET = 'test-secret'
const TIMESHEET_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_TIMESHEET_ID = '22222222-2222-4222-8222-222222222222'

function token(payload) {
  return `Bearer ${jwt.sign(payload, SECRET)}`
}

const consultantToken = token({ userId: 'consultant-1', role: 'CONSULTANT' })
const managerToken   = token({ userId: 'manager-1',    role: 'LINE_MANAGER' })
const financeToken   = token({ userId: 'finance-1',    role: 'FINANCE_MANAGER' })

const fakeTimesheet = {
  timesheet_id:  TIMESHEET_ID,
  consultant_id: 'consultant-1',
  consultant_name: 'Alex Consultant',
  assignment_id: null,
  assignment_client_name: null,
  week_start:    '2025-03-24',
  status:        'DRAFT',
  rejection_comment: null,
  created_at:    '2025-03-24T00:00:00Z',
  updated_at:    '2025-03-24T00:00:00Z',
}

const assignedTimesheet = {
  ...fakeTimesheet,
  assignment_id: '33333333-3333-4333-8333-333333333333',
  assignment_client_name: 'Acme Corp',
}

const rejectedTimesheet = {
  ...fakeTimesheet,
  status: 'REJECTED',
  rejection_comment: 'Please correct Monday hours',
}

const pendingTimesheetWithFeedback = {
  ...fakeTimesheet,
  status: 'PENDING',
  rejection_comment: 'Please correct Monday hours',
}

const fakeEntry = {
  entry_id:     'entry-1',
  entry_date:   '2025-03-24',
  entry_kind: 'CLIENT',
  assignment_id: '33333333-3333-4333-8333-333333333333',
  bucket_label: 'Acme Corp',
  hours_worked: '7.50',
}

const internalEntry = {
  entry_id: 'entry-2',
  entry_date: '2025-03-24',
  entry_kind: 'INTERNAL',
  assignment_id: null,
  bucket_label: 'Internal',
  hours_worked: '7.50',
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/timesheets
// ---------------------------------------------------------------------------
describe('GET /api/timesheets', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/timesheets')
    expect(res.status).toBe(401)
  })

  it('consultant receives their own timesheets', async () => {
    timesheetModel.getTimesheetsByConsultant.mockResolvedValue([fakeTimesheet])
    entryModel.getWorkSummariesByTimesheetIds.mockResolvedValue([])

    const res = await request(app)
      .get('/api/timesheets')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].id).toBe(TIMESHEET_ID)
    expect(res.body[0].consultantName).toBe('Alex Consultant')
    expect(timesheetModel.getTimesheetsByConsultant).toHaveBeenCalledWith('consultant-1')
  })

  it('line manager receives their assigned timesheets', async () => {
    timesheetModel.getTimesheetsForManager.mockResolvedValue([fakeTimesheet])
    entryModel.getWorkSummariesByTimesheetIds.mockResolvedValue([])

    const res = await request(app)
      .get('/api/timesheets')
      .set('Authorization', managerToken)

    expect(res.status).toBe(200)
    expect(res.body[0].id).toBe(TIMESHEET_ID)
    expect(res.body[0].consultantName).toBe('Alex Consultant')
    expect(timesheetModel.getTimesheetsForManager).toHaveBeenCalledWith('manager-1')
  })
})

// ---------------------------------------------------------------------------
// POST /api/timesheets
// ---------------------------------------------------------------------------
describe('POST /api/timesheets', () => {
  it('creates a timesheet for a valid Monday', async () => {
    timesheetModel.createTimesheet.mockResolvedValue(fakeTimesheet)

    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', consultantToken)
      .send({ weekStart: '2025-03-24' })

    expect(res.status).toBe(201)
    expect(res.body.id).toBe(TIMESHEET_ID)
    expect(res.body.weekStart).toBe('2025-03-24')
    expect(res.body.consultantName).toBe('Alex Consultant')
  })

  it('returns 400 when weekStart is missing', async () => {
    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', consultantToken)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 when weekStart is not a Monday', async () => {
    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', consultantToken)
      .send({ weekStart: '2025-03-25' }) // Tuesday

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/Monday/)
  })

  it('returns 409 when a timesheet for that week already exists', async () => {
    const err = new Error('duplicate')
    err.code = '23505'
    timesheetModel.createTimesheet.mockRejectedValue(err)

    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', consultantToken)
      .send({ weekStart: '2025-03-24' })

    expect(res.status).toBe(409)
  })

  it('returns 403 when a line manager tries to create a timesheet', async () => {
    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', managerToken)
      .send({ weekStart: '2025-03-24' })

    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// GET /api/timesheets/:id
// ---------------------------------------------------------------------------
describe('GET /api/timesheets/:id', () => {
  it('returns the timesheet with entries for the owning consultant', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(assignedTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry])

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(TIMESHEET_ID)
    expect(res.body.consultantName).toBe('Alex Consultant')
    expect(res.body.assignmentClientName).toBe('Acme Corp')
    expect(res.body.workSummary).toEqual([{
      entryKind: 'CLIENT',
      assignmentId: '33333333-3333-4333-8333-333333333333',
      bucketLabel: 'Acme Corp',
      totalHours: 7.5,
    }])
    expect(res.body.entries).toHaveLength(1)
    expect(res.body.entries[0].hoursWorked).toBe(7.5)
  })

  it('returns suggested hourly rates for finance consumers', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...assignedTimesheet, status: 'APPROVED' })
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry, {
      ...internalEntry,
      entry_date: '2025-03-25',
    }])
    clientAssignmentModel.getAssignmentById.mockResolvedValue({
      assignment_id: '33333333-3333-4333-8333-333333333333',
      consultant_id: 'consultant-1',
      client_name: 'Acme Corp',
      hourly_rate: '55.00',
      created_at: '2025-03-24T00:00:00Z',
    })

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}`)
      .set('Authorization', financeToken)

    expect(res.status).toBe(200)
    expect(res.body.workSummary).toEqual([
      {
        entryKind: 'CLIENT',
        assignmentId: '33333333-3333-4333-8333-333333333333',
        bucketLabel: 'Acme Corp',
        totalHours: 7.5,
        suggestedHourlyRate: 55,
      },
      {
        entryKind: 'INTERNAL',
        assignmentId: null,
        bucketLabel: 'Internal',
        totalHours: 7.5,
        suggestedHourlyRate: null,
      },
    ])
  })

  it('returns manager feedback for a pending timesheet after resubmission', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(pendingTimesheetWithFeedback)
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry])

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PENDING')
    expect(res.body.rejectionComment).toBe('Please correct Monday hours')
  })

  it('returns 404 when timesheet does not exist', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(null)

    const res = await request(app)
      .get(`/api/timesheets/${MISSING_TIMESHEET_ID}`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(404)
  })

  it('returns 403 when consultant accesses another consultant\'s timesheet', async () => {
    const otherTimesheet = { ...fakeTimesheet, consultant_id: 'consultant-2' }
    timesheetModel.getTimesheetById.mockResolvedValue(otherTimesheet)

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(403)
  })

  it('returns 403 when line manager accesses unassigned timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    timesheetModel.getTimesheetsForManager.mockResolvedValue([])

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}`)
      .set('Authorization', managerToken)

    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/timesheets/:id/entries
// ---------------------------------------------------------------------------
describe('PUT /api/timesheets/:id/entries', () => {
  const validEntries = [{ date: '2025-03-24', entryKind: 'INTERNAL', hoursWorked: 7.5 }]
  const validClientEntries = [{
    date: '2025-03-24',
    entryKind: 'CLIENT',
    assignmentId: '33333333-3333-4333-8333-333333333333',
    hoursWorked: 7.5,
  }]

  it('saves entries for a DRAFT timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.upsertEntries.mockResolvedValue([internalEntry])

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(200)
    expect(res.body[0].hoursWorked).toBe(7.5)
  })

  it('saves entries for a REJECTED timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(rejectedTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([internalEntry])
    entryModel.upsertEntries.mockResolvedValue([internalEntry])

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(200)
    expect(res.body[0].hoursWorked).toBe(7.5)
  })

  it('saves client entries owned by the consultant', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    clientAssignmentModel.getAssignmentById.mockResolvedValue({
      assignment_id: '33333333-3333-4333-8333-333333333333',
      consultant_id: 'consultant-1',
      client_name: 'Acme Corp',
      hourly_rate: '750.00',
      created_at: '2025-03-24T00:00:00Z',
    })
    entryModel.upsertEntries.mockResolvedValue([fakeEntry])

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: validClientEntries })

    expect(res.status).toBe(200)
    expect(clientAssignmentModel.getAssignmentById).toHaveBeenCalledWith('33333333-3333-4333-8333-333333333333')
  })

  it('returns 409 when timesheet is not editable', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, status: 'APPROVED' })

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(409)
  })

  it('allows clearing all entries on a DRAFT timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.upsertEntries.mockResolvedValue([])

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: [] })

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 400 when an entry has hoursWorked above 24', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: [{ date: '2025-03-24', entryKind: 'INTERNAL', hoursWorked: 25 }] })

    expect(res.status).toBe(400)
  })

  it('returns 400 when an entry date is not in YYYY-MM-DD format', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: [{ date: '24/03/2025', entryKind: 'INTERNAL', hoursWorked: 7.5 }] })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/date/i)
  })

  it('returns 400 when an entry date falls outside the timesheet week', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: [{ date: '2025-03-31', entryKind: 'INTERNAL', hoursWorked: 7.5 }] })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/week/i)
  })

  it('returns 409 when a rejected timesheet changes its work category structure', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(rejectedTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([internalEntry])

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({
        entries: [{
          date: '2025-03-24',
          entryKind: 'CLIENT',
          assignmentId: '33333333-3333-4333-8333-333333333333',
          hoursWorked: 7.5,
        }],
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/existing work categories/i)
  })

  it('returns 403 when consultant does not own the timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, consultant_id: 'consultant-2' })

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// POST /api/timesheets/:id/submit
// ---------------------------------------------------------------------------
describe('POST /api/timesheets/:id/submit', () => {
  it('submits a DRAFT timesheet and logs an audit event', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    timesheetModel.updateTimesheetStatus.mockResolvedValue({ ...fakeTimesheet, status: 'PENDING' })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PENDING')
    expect(res.body.consultantName).toBe('Alex Consultant')
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUBMISSION', timesheetId: TIMESHEET_ID })
    )
  })

  it('submits a REJECTED timesheet and logs a submission event', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(rejectedTimesheet)
    timesheetModel.updateTimesheetStatus.mockResolvedValue({ ...rejectedTimesheet, status: 'PENDING' })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PENDING')
    expect(res.body.consultantName).toBe('Alex Consultant')
    expect(res.body.rejectionComment).toBe('Please correct Monday hours')
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUBMISSION', timesheetId: TIMESHEET_ID })
    )
  })

  it('returns 409 when timesheet is already PENDING', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, status: 'PENDING' })

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(409)
  })

  it('returns 403 when consultant does not own the timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, consultant_id: 'consultant-2' })

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(403)
  })

  it('returns 404 when timesheet does not exist', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(null)

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(404)
  })
})

// ---------------------------------------------------------------------------
// GET /api/timesheets/:id/autofill
// ---------------------------------------------------------------------------
describe('GET /api/timesheets/:id/autofill', () => {
  it('returns previous week entries mapped through the DTO', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    timesheetModel.getPreviousWeekEntries.mockResolvedValue([fakeEntry])

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}/autofill`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body[0].date).toBe('2025-03-24')
    expect(res.body[0].entryKind).toBe('CLIENT')
    expect(res.body[0].hoursWorked).toBe(7.5)
  })

  it('returns an empty array when no previous timesheet exists', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    timesheetModel.getPreviousWeekEntries.mockResolvedValue([])

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}/autofill`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 403 when consultant does not own the timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, consultant_id: 'consultant-2' })

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}/autofill`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(403)
  })

  it('returns 409 when the timesheet is not a draft', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(rejectedTimesheet)

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}/autofill`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(409)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/timesheets/:id/review
// ---------------------------------------------------------------------------
describe('PATCH /api/timesheets/:id/review', () => {
  const pendingTimesheet = { ...fakeTimesheet, status: 'PENDING' }

  it('returns 401 with no token', async () => {
    const res = await request(app).patch(`/api/timesheets/${TIMESHEET_ID}/review`)
    expect(res.status).toBe(401)
  })

  it('returns 403 when a consultant tries to review', async () => {
    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', consultantToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(403)
  })

  it('returns 400 when action is invalid', async () => {
    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'MAYBE' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/APPROVE or REJECT/)
  })

  it('returns 400 when rejecting without a comment', async () => {
    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'REJECT' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/comment/)
  })

  it('returns 400 when rejecting with a blank comment', async () => {
    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'REJECT', comment: '   ' })

    expect(res.status).toBe(400)
  })

  it('returns 404 when timesheet does not exist', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(null)

    const res = await request(app)
      .patch(`/api/timesheets/${MISSING_TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(404)
  })

  it('returns 409 when timesheet is not PENDING', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet) // status: DRAFT

    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/pending/)
  })

  it('returns 403 when manager is not assigned to the consultant', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(pendingTimesheet)
    timesheetModel.getTimesheetsForManager.mockResolvedValue([]) // no assigned timesheets

    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(403)
  })

  it('approves a PENDING timesheet and logs an APPROVAL audit event', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(pendingTimesheet)
    timesheetModel.getTimesheetsForManager.mockResolvedValue([pendingTimesheet])
    timesheetModel.reviewTimesheet.mockResolvedValue({
      ...pendingTimesheet, status: 'APPROVED', rejection_comment: null,
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('APPROVED')
    expect(res.body.consultantName).toBe('Alex Consultant')
    expect(res.body.rejectionComment).toBeNull()
    expect(timesheetModel.reviewTimesheet).toHaveBeenCalledWith(TIMESHEET_ID, 'manager-1', 'APPROVED', null)
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVAL', timesheetId: TIMESHEET_ID })
    )
  })

  it('rejects a PENDING timesheet with a comment and logs a REJECTION audit event', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(pendingTimesheet)
    timesheetModel.getTimesheetsForManager.mockResolvedValue([pendingTimesheet])
    timesheetModel.reviewTimesheet.mockResolvedValue({
      ...pendingTimesheet, status: 'REJECTED', rejection_comment: 'Missing Monday hours',
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'REJECT', comment: 'Missing Monday hours' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('REJECTED')
    expect(res.body.consultantName).toBe('Alex Consultant')
    expect(res.body.rejectionComment).toBe('Missing Monday hours')
    expect(timesheetModel.reviewTimesheet).toHaveBeenCalledWith(TIMESHEET_ID, 'manager-1', 'REJECTED', 'Missing Monday hours')
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REJECTION', timesheetId: TIMESHEET_ID })
    )
  })
})

// ---------------------------------------------------------------------------
// POST /api/timesheets/:id/payment
// ---------------------------------------------------------------------------
describe('POST /api/timesheets/:id/payment', () => {
  it('processes payment using per-category rates and logs the calculated amount', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, status: 'APPROVED' })
    entryModel.getEntriesByTimesheet.mockResolvedValue([
      {
        entry_id: 'entry-a',
        entry_date: '2025-03-24',
        entry_kind: 'CLIENT',
        assignment_id: '33333333-3333-4333-8333-333333333333',
        bucket_label: 'Acme Corp',
        hours_worked: '4.00',
      },
      {
        entry_id: 'entry-b',
        entry_date: '2025-03-25',
        entry_kind: 'INTERNAL',
        assignment_id: null,
        bucket_label: 'Internal',
        hours_worked: '3.50',
      },
    ])
    paymentModel.getPaymentByTimesheet.mockResolvedValue(null)
    paymentModel.createPayment.mockResolvedValue({
      payment_id: '44444444-4444-4444-8444-444444444444',
      timesheet_id: TIMESHEET_ID,
      processed_by: 'finance-1',
      daily_rate: null,
      amount: '240.00',
      status: 'COMPLETED',
      breakdowns: [
        {
          entryKind: 'CLIENT',
          assignmentId: '33333333-3333-4333-8333-333333333333',
          bucketLabel: 'Acme Corp',
          hoursWorked: 4,
          hourlyRate: 40,
          amount: 160,
        },
        {
          entryKind: 'INTERNAL',
          assignmentId: null,
          bucketLabel: 'Internal',
          hoursWorked: 3.5,
          hourlyRate: 22.8571428571,
          amount: 80,
        },
      ],
      created_at: '2025-03-28T10:30:00Z',
    })
    paymentModel.createFinancialNote.mockResolvedValue({})
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/payment`)
      .set('Authorization', financeToken)
      .send({
        breakdowns: [
          {
            entryKind: 'CLIENT',
            assignmentId: '33333333-3333-4333-8333-333333333333',
            hourlyRate: 40,
          },
          {
            entryKind: 'INTERNAL',
            hourlyRate: 22.8571428571,
          },
        ],
        notes: '  processed  ',
      })

    expect(res.status).toBe(200)
    expect(res.body.hourlyRate).toBeNull()
    expect(res.body.amount).toBe(240)
    expect(paymentModel.createPayment).toHaveBeenCalledWith({
      timesheetId: TIMESHEET_ID,
      processedBy: 'finance-1',
      amount: 240,
      breakdowns: [
        {
          entryKind: 'CLIENT',
          assignmentId: '33333333-3333-4333-8333-333333333333',
          bucketLabel: 'Acme Corp',
          hoursWorked: 4,
          hourlyRate: 40,
          amount: 160,
        },
        {
          entryKind: 'INTERNAL',
          assignmentId: null,
          bucketLabel: 'Internal',
          hoursWorked: 3.5,
          hourlyRate: 22.8571428571,
          amount: 80,
        },
      ],
    })
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROCESSING',
        timesheetId: TIMESHEET_ID,
        detail: expect.objectContaining({ amount: 240, totalHours: 7.5 }),
      })
    )
  })

  it('returns 400 when payment breakdowns are missing or invalid', async () => {
    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/payment`)
      .set('Authorization', financeToken)
      .send({ breakdowns: [] })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/breakdowns/)
  })
})
