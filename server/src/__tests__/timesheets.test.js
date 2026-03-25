import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret'
process.env.LOG_LEVEL = 'silent'

vi.mock('../models/timesheetModel.js', () => ({
  getTimesheetsByConsultant: vi.fn(),
  getTimesheetsForManager: vi.fn(),
  getTimesheetById: vi.fn(),
  createTimesheet: vi.fn(),
  updateTimesheetStatus: vi.fn(),
  getPreviousWeekEntries: vi.fn(),
  reviewTimesheet: vi.fn(),
}))

vi.mock('../models/timesheetEntryModel.js', () => ({
  getEntriesByTimesheet: vi.fn(),
  upsertEntries: vi.fn(),
}))

vi.mock('../models/auditModel.js', () => ({
  logAction: vi.fn(),
}))

import app from '../app.js'
import * as timesheetModel from '../models/timesheetModel.js'
import * as entryModel from '../models/timesheetEntryModel.js'
import * as auditModel from '../models/auditModel.js'

const SECRET = 'test-secret'

function token(payload) {
  return `Bearer ${jwt.sign(payload, SECRET)}`
}

const consultantToken = token({ userId: 'consultant-1', role: 'CONSULTANT' })
const managerToken   = token({ userId: 'manager-1',    role: 'LINE_MANAGER' })

const fakeTimesheet = {
  timesheet_id:  'ts-1',
  consultant_id: 'consultant-1',
  assignment_id: null,
  week_start:    '2025-03-24',
  status:        'DRAFT',
  rejection_comment: null,
  created_at:    '2025-03-24T00:00:00Z',
  updated_at:    '2025-03-24T00:00:00Z',
}

const fakeEntry = {
  entry_id:     'entry-1',
  entry_date:   '2025-03-24',
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

    const res = await request(app)
      .get('/api/timesheets')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].id).toBe('ts-1')
    expect(timesheetModel.getTimesheetsByConsultant).toHaveBeenCalledWith('consultant-1')
  })

  it('line manager receives their assigned timesheets', async () => {
    timesheetModel.getTimesheetsForManager.mockResolvedValue([fakeTimesheet])

    const res = await request(app)
      .get('/api/timesheets')
      .set('Authorization', managerToken)

    expect(res.status).toBe(200)
    expect(res.body[0].id).toBe('ts-1')
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
    expect(res.body.id).toBe('ts-1')
    expect(res.body.weekStart).toBe('2025-03-24')
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
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry])

    const res = await request(app)
      .get('/api/timesheets/ts-1')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe('ts-1')
    expect(res.body.entries).toHaveLength(1)
    expect(res.body.entries[0].hoursWorked).toBe(7.5)
  })

  it('returns 404 when timesheet does not exist', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(null)

    const res = await request(app)
      .get('/api/timesheets/ts-999')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(404)
  })

  it('returns 403 when consultant accesses another consultant\'s timesheet', async () => {
    const otherTimesheet = { ...fakeTimesheet, consultant_id: 'consultant-2' }
    timesheetModel.getTimesheetById.mockResolvedValue(otherTimesheet)

    const res = await request(app)
      .get('/api/timesheets/ts-1')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(403)
  })

  it('returns 403 when line manager accesses unassigned timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    timesheetModel.getTimesheetsForManager.mockResolvedValue([])

    const res = await request(app)
      .get('/api/timesheets/ts-1')
      .set('Authorization', managerToken)

    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// PUT /api/timesheets/:id/entries
// ---------------------------------------------------------------------------
describe('PUT /api/timesheets/:id/entries', () => {
  const validEntries = [{ date: '2025-03-24', hoursWorked: 7.5 }]

  it('saves entries for a DRAFT timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.upsertEntries.mockResolvedValue([fakeEntry])

    const res = await request(app)
      .put('/api/timesheets/ts-1/entries')
      .set('Authorization', consultantToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(200)
    expect(res.body[0].hoursWorked).toBe(7.5)
  })

  it('returns 409 when timesheet is not DRAFT', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, status: 'PENDING' })

    const res = await request(app)
      .put('/api/timesheets/ts-1/entries')
      .set('Authorization', consultantToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(409)
  })

  it('returns 400 when entries array is empty', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)

    const res = await request(app)
      .put('/api/timesheets/ts-1/entries')
      .set('Authorization', consultantToken)
      .send({ entries: [] })

    expect(res.status).toBe(400)
  })

  it('returns 400 when an entry has hoursWorked above 24', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)

    const res = await request(app)
      .put('/api/timesheets/ts-1/entries')
      .set('Authorization', consultantToken)
      .send({ entries: [{ date: '2025-03-24', hoursWorked: 25 }] })

    expect(res.status).toBe(400)
  })

  it('returns 403 when consultant does not own the timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, consultant_id: 'consultant-2' })

    const res = await request(app)
      .put('/api/timesheets/ts-1/entries')
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
      .post('/api/timesheets/ts-1/submit')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PENDING')
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SUBMISSION', timesheetId: 'ts-1' })
    )
  })

  it('returns 400 when timesheet is already PENDING', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, status: 'PENDING' })

    const res = await request(app)
      .post('/api/timesheets/ts-1/submit')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(400)
  })

  it('returns 403 when consultant does not own the timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, consultant_id: 'consultant-2' })

    const res = await request(app)
      .post('/api/timesheets/ts-1/submit')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(403)
  })

  it('returns 404 when timesheet does not exist', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(null)

    const res = await request(app)
      .post('/api/timesheets/ts-1/submit')
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
      .get('/api/timesheets/ts-1/autofill')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body[0].date).toBe('2025-03-24')
    expect(res.body[0].hoursWorked).toBe(7.5)
  })

  it('returns an empty array when no previous timesheet exists', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    timesheetModel.getPreviousWeekEntries.mockResolvedValue([])

    const res = await request(app)
      .get('/api/timesheets/ts-1/autofill')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 403 when consultant does not own the timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, consultant_id: 'consultant-2' })

    const res = await request(app)
      .get('/api/timesheets/ts-1/autofill')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/timesheets/:id/review
// ---------------------------------------------------------------------------
describe('PATCH /api/timesheets/:id/review', () => {
  const pendingTimesheet = { ...fakeTimesheet, status: 'PENDING' }

  it('returns 401 with no token', async () => {
    const res = await request(app).patch('/api/timesheets/ts-1/review')
    expect(res.status).toBe(401)
  })

  it('returns 403 when a consultant tries to review', async () => {
    const res = await request(app)
      .patch('/api/timesheets/ts-1/review')
      .set('Authorization', consultantToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(403)
  })

  it('returns 400 when action is invalid', async () => {
    const res = await request(app)
      .patch('/api/timesheets/ts-1/review')
      .set('Authorization', managerToken)
      .send({ action: 'MAYBE' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/APPROVE or REJECT/)
  })

  it('returns 400 when rejecting without a comment', async () => {
    const res = await request(app)
      .patch('/api/timesheets/ts-1/review')
      .set('Authorization', managerToken)
      .send({ action: 'REJECT' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/comment/)
  })

  it('returns 400 when rejecting with a blank comment', async () => {
    const res = await request(app)
      .patch('/api/timesheets/ts-1/review')
      .set('Authorization', managerToken)
      .send({ action: 'REJECT', comment: '   ' })

    expect(res.status).toBe(400)
  })

  it('returns 404 when timesheet does not exist', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(null)

    const res = await request(app)
      .patch('/api/timesheets/ts-999/review')
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(404)
  })

  it('returns 409 when timesheet is not PENDING', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet) // status: DRAFT

    const res = await request(app)
      .patch('/api/timesheets/ts-1/review')
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/pending/)
  })

  it('returns 403 when manager is not assigned to the consultant', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(pendingTimesheet)
    timesheetModel.getTimesheetsForManager.mockResolvedValue([]) // no assigned timesheets

    const res = await request(app)
      .patch('/api/timesheets/ts-1/review')
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
      .patch('/api/timesheets/ts-1/review')
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('APPROVED')
    expect(res.body.rejectionComment).toBeNull()
    expect(timesheetModel.reviewTimesheet).toHaveBeenCalledWith('ts-1', 'manager-1', 'APPROVED', null)
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'APPROVAL', timesheetId: 'ts-1' })
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
      .patch('/api/timesheets/ts-1/review')
      .set('Authorization', managerToken)
      .send({ action: 'REJECT', comment: 'Missing Monday hours' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('REJECTED')
    expect(res.body.rejectionComment).toBe('Missing Monday hours')
    expect(timesheetModel.reviewTimesheet).toHaveBeenCalledWith('ts-1', 'manager-1', 'REJECTED', 'Missing Monday hours')
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REJECTION', timesheetId: 'ts-1' })
    )
  })
})
