import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
  returnTimesheetToManager: vi.fn(),
}))

vi.mock('../models/timesheetEntryModel.js', () => ({
  getEntriesByTimesheet: vi.fn(),
  getWorkSummariesByTimesheetIds: vi.fn(),
  upsertEntries: vi.fn(),
}))

vi.mock('../models/clientAssignmentModel.js', () => ({
  getAssignmentById: vi.fn(),
  getAssignmentByIdIncludingDeleted: vi.fn(),
}))

vi.mock('../models/lineManagerConsultantModel.js', () => ({
  getManagerAssignmentByConsultantId: vi.fn(),
}))

vi.mock('../models/userModel.js', () => ({
  findUserById: vi.fn(),
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
import * as managerAssignmentModel from '../models/lineManagerConsultantModel.js'
import * as userModel from '../models/userModel.js'
import * as auditModel from '../models/auditModel.js'
import * as paymentModel from '../models/paymentModel.js'

const SECRET = 'test-secret'
const TIMESHEET_ID = '11111111-1111-4111-8111-111111111111'
const MISSING_TIMESHEET_ID = '22222222-2222-4222-8222-222222222222'
const MANAGER_UUID = '33333333-3333-4333-8333-333333333333'

function token(payload) {
  return `Bearer ${jwt.sign(payload, SECRET)}`
}

const consultantToken = token({ userId: 'consultant-1', role: 'CONSULTANT' })
const managerToken   = token({ userId: 'manager-1',    role: 'LINE_MANAGER' })
const uuidManagerToken = token({ userId: MANAGER_UUID, role: 'LINE_MANAGER' })
const financeToken   = token({ userId: 'finance-1',    role: 'FINANCE_MANAGER' })
const authUsers = {
  'consultant-1': {
    user_id: 'consultant-1',
    name: 'Alex Consultant',
    email: 'alex@example.com',
    role: 'CONSULTANT',
    default_pay_rate: '35.00',
    created_at: '2025-02-03T09:00:00Z',
  },
  'manager-1': {
    user_id: 'manager-1',
    name: 'Lina Manager',
    email: 'lina@example.com',
    role: 'LINE_MANAGER',
    default_pay_rate: '45.00',
    created_at: '2025-02-03T09:00:00Z',
  },
  [MANAGER_UUID]: {
    user_id: MANAGER_UUID,
    name: 'Lina Manager',
    email: 'lina.uuid@example.com',
    role: 'LINE_MANAGER',
    default_pay_rate: '45.00',
    created_at: '2025-02-03T09:00:00Z',
  },
  'finance-1': {
    user_id: 'finance-1',
    name: 'Finance User',
    email: 'finance@example.com',
    role: 'FINANCE_MANAGER',
    default_pay_rate: '50.00',
    created_at: '2025-02-03T09:00:00Z',
  },
}

function statusError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

const fakeTimesheet = {
  timesheet_id:  TIMESHEET_ID,
  consultant_id: 'consultant-1',
  consultant_name: 'Alex Consultant',
  assignment_id: null,
  assignment_client_name: null,
  week_start:    '2025-03-24',
  status:        'DRAFT',
  submitted_at: null,
  submitted_late: false,
  rejection_comment: null,
  created_at:    '2025-03-24T00:00:00Z',
  updated_at:    '2025-03-24T00:00:00Z',
}

const managerSelfTimesheet = {
  ...fakeTimesheet,
  consultant_id: 'manager-1',
  consultant_name: 'Lina Manager',
}

const assignedTimesheet = {
  ...fakeTimesheet,
  assignment_id: '33333333-3333-4333-8333-333333333333',
  assignment_client_name: 'Acme Corp',
}

const rejectedTimesheet = {
  ...fakeTimesheet,
  week_start: '2025-03-17',
  status: 'REJECTED',
  submitted_at: '2025-03-24T09:15:00Z',
  submitted_late: true,
  rejection_comment: 'Please correct Monday hours',
}

const pendingTimesheetWithFeedback = {
  ...fakeTimesheet,
  week_start: '2025-03-17',
  status: 'PENDING',
  submitted_at: '2025-03-24T09:15:00Z',
  submitted_late: true,
  rejection_comment: 'Please correct Monday hours',
}

const financeReturnedTimesheet = {
  ...fakeTimesheet,
  status: 'FINANCE_REJECTED',
  finance_return_comment: 'Client billing split does not match the work summary',
  finance_returned_at: '2025-03-28T10:30:00Z',
  finance_returned_by_name: 'Finance User',
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
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2025-03-27T12:00:00Z'))
  vi.clearAllMocks()
  userModel.findUserById.mockImplementation(async (id) => authUsers[id] ?? null)
  managerAssignmentModel.getManagerAssignmentByConsultantId.mockResolvedValue({
    manager_id: 'manager-1',
    manager_name: 'Lina Manager',
    manager_email: 'lina@example.com',
  })
  timesheetModel.getTimesheetsByConsultant.mockResolvedValue([])
  entryModel.getWorkSummariesByTimesheetIds.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

// ---------------------------------------------------------------------------
// GET /api/timesheets
// ---------------------------------------------------------------------------
describe('GET /api/timesheets', () => {
  it('returns 401 with no token', async () => {
    const res = await request(app).get('/api/timesheets')
    expect(res.status).toBe(401)
  })

  it('returns 401 when the authenticated user no longer exists', async () => {
    userModel.findUserById.mockResolvedValueOnce(null)

    const res = await request(app)
      .get('/api/timesheets')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(401)
    expect(res.body.error).toMatch(/no longer exists/i)
    expect(timesheetModel.getTimesheetsByConsultant).not.toHaveBeenCalled()
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

  it('line manager can request their own timesheets separately from the review queue', async () => {
    timesheetModel.getTimesheetsByConsultant.mockResolvedValue([managerSelfTimesheet])
    entryModel.getWorkSummariesByTimesheetIds.mockResolvedValue([])

    const res = await request(app)
      .get('/api/timesheets?scope=own')
      .set('Authorization', managerToken)

    expect(res.status).toBe(200)
    expect(res.body[0].consultantName).toBe('Lina Manager')
    expect(timesheetModel.getTimesheetsByConsultant).toHaveBeenCalledWith('manager-1')
    expect(timesheetModel.getTimesheetsForManager).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// GET /api/timesheets/eligible-weeks
// ---------------------------------------------------------------------------
describe('GET /api/timesheets/eligible-weeks', () => {
  it('returns only missing past weeks within the 4 week window', async () => {
    timesheetModel.getTimesheetsByConsultant.mockResolvedValue([
      { ...fakeTimesheet, week_start: '2025-03-24' },
      { ...fakeTimesheet, week_start: '2025-03-10' },
    ])

    const res = await request(app)
      .get('/api/timesheets/eligible-weeks')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      currentWeekStart: '2025-03-24',
      missingPastWeekStarts: ['2025-03-17', '2025-03-03', '2025-02-24'],
    })
  })

  it('allows a line manager to list eligible weeks for their own timesheets', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: 'manager-1',
      role: 'LINE_MANAGER',
      created_at: '2025-02-03T09:00:00Z',
    })
    timesheetModel.getTimesheetsByConsultant.mockResolvedValue([])

    const res = await request(app)
      .get('/api/timesheets/eligible-weeks')
      .set('Authorization', managerToken)

    expect(res.status).toBe(200)
    expect(res.body.currentWeekStart).toBe('2025-03-24')
    expect(timesheetModel.getTimesheetsByConsultant).toHaveBeenCalledWith('manager-1')
  })

  it('does not return weeks before the consultant account existed', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: 'consultant-1',
      role: 'CONSULTANT',
      created_at: '2025-03-25T09:00:00Z',
    })

    const res = await request(app)
      .get('/api/timesheets/eligible-weeks')
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      currentWeekStart: '2025-03-24',
      missingPastWeekStarts: [],
    })
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

  it('returns 400 when weekStart is in the future', async () => {
    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', consultantToken)
      .send({ weekStart: '2025-03-31' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/future/i)
  })

  it('returns 400 when weekStart is older than the 4 week window', async () => {
    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', consultantToken)
      .send({ weekStart: '2025-02-17' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/previous 4 weeks/i)
  })

  it('returns 400 when weekStart is before the consultant account existed', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: 'consultant-1',
      role: 'CONSULTANT',
      created_at: '2025-03-25T09:00:00Z',
    })

    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', consultantToken)
      .send({ weekStart: '2025-03-17' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/account existed/i)
  })

  it('returns 409 when a timesheet for that week already exists', async () => {
    timesheetModel.getTimesheetsByConsultant.mockResolvedValue([
      { ...fakeTimesheet, week_start: '2025-03-24' },
    ])

    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', consultantToken)
      .send({ weekStart: '2025-03-24' })

    expect(res.status).toBe(409)
  })

  it('allows a line manager to create their own timesheet', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: 'manager-1',
      role: 'LINE_MANAGER',
      created_at: '2025-02-03T09:00:00Z',
    })
    timesheetModel.createTimesheet.mockResolvedValue(managerSelfTimesheet)

    const res = await request(app)
      .post('/api/timesheets')
      .set('Authorization', managerToken)
      .send({ weekStart: '2025-03-24' })

    expect(res.status).toBe(201)
    expect(timesheetModel.createTimesheet).toHaveBeenCalledWith({
      consultantId: 'manager-1',
      assignmentId: null,
      weekStart: '2025-03-24',
    })
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
    userModel.findUserById.mockResolvedValue({
      user_id: 'consultant-1',
      role: 'CONSULTANT',
      default_pay_rate: '35.00',
    })
    clientAssignmentModel.getAssignmentByIdIncludingDeleted.mockResolvedValue({
      assignment_id: '33333333-3333-4333-8333-333333333333',
      consultant_id: 'consultant-1',
      client_name: 'Acme Corp',
      client_bill_rate: '55.00',
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
        suggestedBillRate: 55,
        suggestedPayRate: 35,
      },
      {
        entryKind: 'INTERNAL',
        assignmentId: null,
        bucketLabel: 'Internal',
        totalHours: 7.5,
        suggestedBillRate: 0,
        suggestedPayRate: 35,
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

  it('allows a line manager to access their own timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(managerSelfTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([internalEntry])

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}`)
      .set('Authorization', managerToken)

    expect(res.status).toBe(200)
    expect(res.body.consultantName).toBe('Lina Manager')
    expect(timesheetModel.getTimesheetsForManager).not.toHaveBeenCalled()
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
  const archivedClientEntries = [{
    date: '2025-03-17',
    entryKind: 'CLIENT',
    assignmentId: '44444444-4444-4444-8444-444444444444',
    hoursWorked: 7.5,
  }]
  const rejectedWeekClientEntries = [{
    date: '2025-03-17',
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
    clientAssignmentModel.getAssignmentById.mockResolvedValue({
      assignment_id: '33333333-3333-4333-8333-333333333333',
      consultant_id: 'consultant-1',
      client_name: 'Acme Corp',
      client_bill_rate: '750.00',
      created_at: '2025-03-24T00:00:00Z',
    })
    entryModel.upsertEntries.mockResolvedValue([fakeEntry])

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: rejectedWeekClientEntries })

    expect(res.status).toBe(200)
    expect(res.body[0].entryKind).toBe('CLIENT')
  })

  it('saves client entries owned by the consultant', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    clientAssignmentModel.getAssignmentById.mockResolvedValue({
      assignment_id: '33333333-3333-4333-8333-333333333333',
      consultant_id: 'consultant-1',
      client_name: 'Acme Corp',
      client_bill_rate: '750.00',
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

  it('returns 409 when the timesheet becomes uneditable during save', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.upsertEntries.mockRejectedValue(
      statusError('Only draft or rejected timesheets can be edited', 409)
    )

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/draft or rejected/)
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

  it('allows a rejected timesheet to reuse an archived assignment already on the sheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(rejectedTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([{
      ...fakeEntry,
      assignment_id: '44444444-4444-4444-8444-444444444444',
      bucket_label: 'Archived Client',
    }])
    clientAssignmentModel.getAssignmentById.mockResolvedValue(null)
    clientAssignmentModel.getAssignmentByIdIncludingDeleted.mockResolvedValue({
      assignment_id: '44444444-4444-4444-8444-444444444444',
      consultant_id: 'consultant-1',
      client_name: 'Archived Client',
      client_bill_rate: '750.00',
      created_at: '2025-03-24T00:00:00Z',
      deleted_at: '2025-03-26T00:00:00Z',
    })
    entryModel.upsertEntries.mockResolvedValue([{
      ...fakeEntry,
      assignment_id: '44444444-4444-4444-8444-444444444444',
      bucket_label: 'Archived Client',
    }])

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: archivedClientEntries })

    expect(res.status).toBe(200)
    expect(clientAssignmentModel.getAssignmentByIdIncludingDeleted).toHaveBeenCalledWith('44444444-4444-4444-8444-444444444444')
  })

  it('returns 404 when a rejected timesheet introduces an unrelated archived assignment', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(rejectedTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([internalEntry])
    clientAssignmentModel.getAssignmentById.mockResolvedValue(null)

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: archivedClientEntries })

    expect(res.status).toBe(404)
    expect(clientAssignmentModel.getAssignmentByIdIncludingDeleted).not.toHaveBeenCalled()
  })

  it('returns 403 when consultant does not own the timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, consultant_id: 'consultant-2' })

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', consultantToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(403)
  })

  it('allows a line manager to save entries on their own timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(managerSelfTimesheet)
    entryModel.upsertEntries.mockResolvedValue([internalEntry])

    const res = await request(app)
      .put(`/api/timesheets/${TIMESHEET_ID}/entries`)
      .set('Authorization', managerToken)
      .send({ entries: validEntries })

    expect(res.status).toBe(200)
    expect(entryModel.upsertEntries).toHaveBeenCalledWith(TIMESHEET_ID, [
      { ...validEntries[0], assignmentId: null },
    ])
  })
})

// ---------------------------------------------------------------------------
// POST /api/timesheets/:id/submit
// ---------------------------------------------------------------------------
describe('POST /api/timesheets/:id/submit', () => {
  it('submits a DRAFT timesheet and logs an audit event', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry])
    timesheetModel.updateTimesheetStatus.mockResolvedValue({
      ...fakeTimesheet,
      status: 'PENDING',
      submitted_at: '2025-03-27T12:00:00.000Z',
      submitted_late: false,
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PENDING')
    expect(res.body.consultantName).toBe('Alex Consultant')
    expect(timesheetModel.updateTimesheetStatus).toHaveBeenCalledWith(
      TIMESHEET_ID,
      'PENDING',
      expect.objectContaining({
        submittedLate: false,
        submittedManager: {
          id: 'manager-1',
          name: 'Lina Manager',
          email: 'lina@example.com',
        },
      })
    )
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUBMISSION',
        timesheetId: TIMESHEET_ID,
        detail: expect.objectContaining({ submittedLate: false }),
      })
    )
  })

  it('submits a REJECTED timesheet and logs a submission event', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(rejectedTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry])
    timesheetModel.updateTimesheetStatus.mockResolvedValue({
      ...rejectedTimesheet,
      status: 'PENDING',
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PENDING')
    expect(res.body.consultantName).toBe('Alex Consultant')
    expect(res.body.rejectionComment).toBe('Please correct Monday hours')
    expect(timesheetModel.updateTimesheetStatus).toHaveBeenCalledWith(
      TIMESHEET_ID,
      'PENDING',
      expect.objectContaining({
        submittedManager: null,
      })
    )
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUBMISSION',
        timesheetId: TIMESHEET_ID,
        detail: expect.objectContaining({ submittedLate: true }),
      })
    )
  })

  it('marks a first submission for a past week as late', async () => {
    const lateDraftTimesheet = {
      ...fakeTimesheet,
      week_start: '2025-03-17',
    }

    timesheetModel.getTimesheetById.mockResolvedValue(lateDraftTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry])
    timesheetModel.updateTimesheetStatus.mockResolvedValue({
      ...lateDraftTimesheet,
      status: 'PENDING',
      submitted_at: '2025-03-27T12:00:00.000Z',
      submitted_late: true,
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(200)
    expect(timesheetModel.updateTimesheetStatus).toHaveBeenCalledWith(
      TIMESHEET_ID,
      'PENDING',
      expect.objectContaining({
        submittedLate: true,
        submittedManager: {
          id: 'manager-1',
          name: 'Lina Manager',
          email: 'lina@example.com',
        },
      })
    )
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.objectContaining({ submittedLate: true }),
      })
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

  it('returns 400 when the timesheet has no entries', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([])

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/at least one entry/i)
    expect(timesheetModel.updateTimesheetStatus).not.toHaveBeenCalled()
    expect(auditModel.logAction).not.toHaveBeenCalled()
  })

  it('returns 409 when no manager is assigned at submit time', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry])
    managerAssignmentModel.getManagerAssignmentByConsultantId.mockResolvedValue(null)

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/sheet manager/i)
    expect(timesheetModel.updateTimesheetStatus).not.toHaveBeenCalled()
    expect(auditModel.logAction).not.toHaveBeenCalled()
  })

  it('returns 409 when the timesheet becomes unsubmitable during submission', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(fakeTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([fakeEntry])
    timesheetModel.updateTimesheetStatus.mockRejectedValue(
      statusError('Only draft or rejected timesheets can be submitted', 409)
    )

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', consultantToken)

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/draft or rejected/)
    expect(auditModel.logAction).not.toHaveBeenCalled()
  })

  it('allows a line manager to submit their own timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(managerSelfTimesheet)
    entryModel.getEntriesByTimesheet.mockResolvedValue([internalEntry])
    timesheetModel.updateTimesheetStatus.mockResolvedValue({
      ...managerSelfTimesheet,
      status: 'PENDING',
      submitted_at: '2025-03-27T12:00:00.000Z',
      submitted_late: false,
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/submit`)
      .set('Authorization', managerToken)

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('PENDING')
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUBMISSION',
        performedBy: 'manager-1',
      })
    )
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

  it('allows a line manager to autofill their own draft timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(managerSelfTimesheet)
    timesheetModel.getPreviousWeekEntries.mockResolvedValue([internalEntry])

    const res = await request(app)
      .get(`/api/timesheets/${TIMESHEET_ID}/autofill`)
      .set('Authorization', managerToken)

    expect(res.status).toBe(200)
    expect(timesheetModel.getPreviousWeekEntries).toHaveBeenCalledWith('manager-1', managerSelfTimesheet.week_start)
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

  it('returns 403 when manager tries to review their own timesheet', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...managerSelfTimesheet, status: 'PENDING' })

    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/own timesheet/i)
    expect(timesheetModel.getTimesheetsForManager).not.toHaveBeenCalled()
  })

  it('returns 403 when manager tries to review their own timesheet with mixed-case UUIDs', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({
      ...fakeTimesheet,
      consultant_id: MANAGER_UUID.toUpperCase(),
      status: 'PENDING',
    })

    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', uuidManagerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/own timesheet/i)
    expect(timesheetModel.getTimesheetsForManager).not.toHaveBeenCalled()
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

  it('approves a finance-returned timesheet and keeps finance return metadata in the response', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue(financeReturnedTimesheet)
    timesheetModel.getTimesheetsForManager.mockResolvedValue([financeReturnedTimesheet])
    timesheetModel.reviewTimesheet.mockResolvedValue({
      ...financeReturnedTimesheet,
      status: 'APPROVED',
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/review`)
      .set('Authorization', managerToken)
      .send({ action: 'APPROVE' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('APPROVED')
    expect(res.body.financeReturnComment).toBe(financeReturnedTimesheet.finance_return_comment)
    expect(timesheetModel.reviewTimesheet).toHaveBeenCalledWith(
      TIMESHEET_ID,
      'manager-1',
      'APPROVED',
      null
    )
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/timesheets/:id/finance-review
// ---------------------------------------------------------------------------
describe('PATCH /api/timesheets/:id/finance-review', () => {
  it('returns a finance-approved sheet to the line manager with a required comment', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, status: 'APPROVED' })
    timesheetModel.returnTimesheetToManager.mockResolvedValue({
      ...financeReturnedTimesheet,
      timesheet_id: TIMESHEET_ID,
      consultant_name: 'Alex Consultant',
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/finance-review`)
      .set('Authorization', financeToken)
      .send({ action: 'RETURN', comment: '  Client billing split does not match the work summary  ' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('FINANCE_REJECTED')
    expect(res.body.financeReturnComment).toBe('Client billing split does not match the work summary')
    expect(timesheetModel.returnTimesheetToManager).toHaveBeenCalledWith(
      TIMESHEET_ID,
      'finance-1',
      'Client billing split does not match the work summary'
    )
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'FINANCE_RETURN', timesheetId: TIMESHEET_ID })
    )
  })

  it('requires a non-blank comment when returning to the line manager', async () => {
    const res = await request(app)
      .patch(`/api/timesheets/${TIMESHEET_ID}/finance-review`)
      .set('Authorization', financeToken)
      .send({ action: 'RETURN', comment: '   ' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/comment/i)
  })
})

// ---------------------------------------------------------------------------
// POST /api/timesheets/:id/payment
// ---------------------------------------------------------------------------
describe('POST /api/timesheets/:id/payment', () => {
  it('processes payment using bill and pay rates and logs the calculated totals', async () => {
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
      total_bill_amount: '160.00',
      total_pay_amount: '180.00',
      margin_amount: '-20.00',
      status: 'COMPLETED',
      breakdowns: [
        {
          entryKind: 'CLIENT',
          assignmentId: '33333333-3333-4333-8333-333333333333',
          bucketLabel: 'Acme Corp',
          hoursWorked: 4,
          billRate: 40,
          billAmount: 160,
          payRate: 25,
          payAmount: 100,
          marginAmount: 60,
        },
        {
          entryKind: 'INTERNAL',
          assignmentId: null,
          bucketLabel: 'Internal',
          hoursWorked: 3.5,
          billRate: 0,
          billAmount: 0,
          payRate: 22.8571428571,
          payAmount: 80,
          marginAmount: -80,
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
            billRate: 40,
            payRate: 25,
          },
          {
            entryKind: 'INTERNAL',
            billRate: 0,
            payRate: 22.8571428571,
          },
        ],
        notes: '  processed  ',
      })

    expect(res.status).toBe(200)
    expect(res.body.totalBillAmount).toBe(160)
    expect(res.body.totalPayAmount).toBe(180)
    expect(res.body.marginAmount).toBe(-20)
    expect(paymentModel.createPayment).toHaveBeenCalledWith({
      timesheetId: TIMESHEET_ID,
      processedBy: 'finance-1',
      totalBillAmount: 160,
      totalPayAmount: 180,
      marginAmount: -20,
      breakdowns: [
        {
          entryKind: 'CLIENT',
          assignmentId: '33333333-3333-4333-8333-333333333333',
          bucketLabel: 'Acme Corp',
          hoursWorked: 4,
          billRate: 40,
          billAmount: 160,
          payRate: 25,
          payAmount: 100,
          marginAmount: 60,
        },
        {
          entryKind: 'INTERNAL',
          assignmentId: null,
          bucketLabel: 'Internal',
          hoursWorked: 3.5,
          billRate: 0,
          billAmount: 0,
          payRate: 22.8571428571,
          payAmount: 80,
          marginAmount: -80,
        },
      ],
    })
    expect(auditModel.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PROCESSING',
        timesheetId: TIMESHEET_ID,
        detail: expect.objectContaining({
          totalBillAmount: 160,
          totalPayAmount: 180,
          marginAmount: -20,
          totalHours: 7.5,
        }),
      })
    )
  })

  it('uses decimal arithmetic when calculating payment amounts', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, status: 'APPROVED' })
    entryModel.getEntriesByTimesheet.mockResolvedValue([
      {
        entry_id: 'entry-a',
        entry_date: '2025-03-24',
        entry_kind: 'CLIENT',
        assignment_id: '33333333-3333-4333-8333-333333333333',
        bucket_label: 'Acme Corp',
        hours_worked: '1.00',
      },
    ])
    paymentModel.getPaymentByTimesheet.mockResolvedValue(null)
    paymentModel.createPayment.mockResolvedValue({
      payment_id: '44444444-4444-4444-8444-444444444444',
      timesheet_id: TIMESHEET_ID,
      processed_by: 'finance-1',
      total_bill_amount: '1.01',
      total_pay_amount: '0.34',
      margin_amount: '0.67',
      status: 'COMPLETED',
      breakdowns: [],
      created_at: '2025-03-28T10:30:00Z',
    })
    auditModel.logAction.mockResolvedValue({})

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/payment`)
      .set('Authorization', financeToken)
      .send({
        breakdowns: [
          {
            entryKind: 'CLIENT',
            assignmentId: '33333333-3333-4333-8333-333333333333',
            billRate: '1.005',
            payRate: '0.335',
          },
        ],
      })

    expect(res.status).toBe(200)
    expect(paymentModel.createPayment).toHaveBeenCalledWith(expect.objectContaining({
      totalBillAmount: 1.01,
      totalPayAmount: 0.34,
      marginAmount: 0.67,
      breakdowns: [
        expect.objectContaining({
          billAmount: 1.01,
          payAmount: 0.34,
          marginAmount: 0.67,
        }),
      ],
    }))
  })

  it('returns 409 when the timesheet becomes unpayable during processing', async () => {
    timesheetModel.getTimesheetById.mockResolvedValue({ ...fakeTimesheet, status: 'APPROVED' })
    entryModel.getEntriesByTimesheet.mockResolvedValue([{
      entry_id: 'entry-a',
      entry_date: '2025-03-24',
      entry_kind: 'INTERNAL',
      assignment_id: null,
      bucket_label: 'Internal',
      hours_worked: '1.00',
    }])
    paymentModel.getPaymentByTimesheet.mockResolvedValue(null)
    paymentModel.createPayment.mockRejectedValue(
      statusError('Only approved timesheets can be processed for payment', 409)
    )

    const res = await request(app)
      .post(`/api/timesheets/${TIMESHEET_ID}/payment`)
      .set('Authorization', financeToken)
      .send({
        breakdowns: [
          {
            entryKind: 'INTERNAL',
            billRate: 0,
            payRate: 25,
          },
        ],
      })

    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/approved timesheets/)
    expect(auditModel.logAction).not.toHaveBeenCalled()
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
