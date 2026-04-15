#!/usr/bin/env node
// Populates the DB with demo data.
// Usage: node scripts/seed.js
// WARNING: Clears all existing data before seeding.

import bcrypt from 'bcrypt'
import pg from 'pg'
import 'dotenv/config'
import { SALT_ROUNDS } from '../src/constants/security.js'

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

function monday(weeksAgo = 0) {
  const date = new Date()
  const offset = (date.getUTCDay() + 6) % 7
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCDate(date.getUTCDate() - offset - weeksAgo * 7)
  return date.toISOString().slice(0, 10)
}

function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function weekEnd(weekStart) {
  return addDays(weekStart, 6)
}

function at(dateStr, time = '09:00:00') {
  return `${dateStr}T${time}Z`
}

function weekEntries(weekStart, entryKind, hoursPerDay, assignmentId = null) {
  return Array.from({ length: 7 }, (_, index) => ({
    date: addDays(weekStart, index),
    entryKind,
    assignmentId,
    hoursWorked: Number(hoursPerDay[index] ?? 0),
  })).filter((entry) => entry.hoursWorked > 0)
}

function clientWeekEntries(weekStart, assignmentId, hoursPerDay) {
  return weekEntries(weekStart, 'CLIENT', hoursPerDay, assignmentId)
}

function internalWeekEntries(weekStart, hoursPerDay) {
  return weekEntries(weekStart, 'INTERNAL', hoursPerDay)
}

function mergeEntries(...collections) {
  return collections.flat().sort((left, right) => {
    if (left.date !== right.date) return left.date.localeCompare(right.date)
    if (left.entryKind !== right.entryKind) return left.entryKind.localeCompare(right.entryKind)
    return (left.assignmentId ?? '').localeCompare(right.assignmentId ?? '')
  })
}

function totalHours(entries) {
  return entries.reduce((sum, entry) => sum + Number(entry.hoursWorked), 0)
}

function formatHours(hours) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

function bucketKey(entryKind, assignmentId = null) {
  return `${entryKind}:${assignmentId ?? 'INTERNAL'}`
}

function getBucketLabel(entryKind, assignmentId, assignmentsById) {
  if (entryKind === 'INTERNAL') return 'Internal'
  return assignmentsById.get(assignmentId)?.clientName ?? 'Unknown client assignment'
}

function summariseEntries(entries, assignmentsById) {
  const summary = new Map()

  for (const entry of entries) {
    const key = bucketKey(entry.entryKind, entry.assignmentId)
    if (!summary.has(key)) {
      summary.set(key, {
        entryKind: entry.entryKind,
        assignmentId: entry.assignmentId ?? null,
        bucketLabel: getBucketLabel(entry.entryKind, entry.assignmentId ?? null, assignmentsById),
        hoursWorked: 0,
      })
    }

    summary.get(key).hoursWorked += Number(entry.hoursWorked)
  }

  return [...summary.values()].sort((left, right) => {
    if (left.entryKind !== right.entryKind) return left.entryKind.localeCompare(right.entryKind)
    return left.bucketLabel.localeCompare(right.bucketLabel)
  })
}

function buildPaymentBreakdowns({
  entries,
  assignmentsById,
  defaultPayRate,
  rateOverrides = {},
}) {
  return summariseEntries(entries, assignmentsById).map((summary) => {
    const override = rateOverrides[bucketKey(summary.entryKind, summary.assignmentId)] ?? {}
    const billRate = summary.entryKind === 'INTERNAL'
      ? Number(override.billRate ?? 0)
      : Number(override.billRate ?? assignmentsById.get(summary.assignmentId)?.clientBillRate ?? 0)
    const payRate = Number(override.payRate ?? defaultPayRate)
    const billAmount = Number((billRate * summary.hoursWorked).toFixed(2))
    const payAmount = Number((payRate * summary.hoursWorked).toFixed(2))
    const marginAmount = Number((billAmount - payAmount).toFixed(2))

    return {
      entryKind: summary.entryKind,
      assignmentId: summary.assignmentId,
      bucketLabel: summary.bucketLabel,
      hoursWorked: Number(summary.hoursWorked.toFixed(2)),
      billRate,
      billAmount,
      payRate,
      payAmount,
      marginAmount,
    }
  })
}

async function insertEntries(client, timesheetId, entries) {
  for (const entry of entries) {
    await client.query(
      `INSERT INTO timesheet_entries (
         timesheet_id,
         entry_date,
         entry_kind,
         assignment_id,
         hours_worked
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        timesheetId,
        entry.date,
        entry.entryKind,
        entry.assignmentId ?? null,
        entry.hoursWorked,
      ]
    )
  }
}

async function logAudit(client, action, performedBy, timesheetId, detail, createdAt) {
  await client.query(
    `INSERT INTO audit_reports (action, performed_by, timesheet_id, detail, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [action, performedBy, timesheetId, JSON.stringify(detail), createdAt]
  )
}

async function insertUser(client, user, passwordHash) {
  const { rows: [row] } = await client.query(
    `INSERT INTO users (
       name,
       email,
       password_hash,
       role,
       default_pay_rate,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id`,
    [
      user.name,
      user.email,
      passwordHash,
      user.role,
      user.defaultPayRate ?? null,
      user.createdAt,
    ]
  )

  return row
}

async function insertAssignment(client, {
  consultantId,
  clientName,
  clientBillRate,
  createdAt,
  deletedAt = null,
}) {
  const { rows: [row] } = await client.query(
    `INSERT INTO client_assignments (
       consultant_id,
       client_name,
       client_bill_rate,
       deleted_at,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5)
     RETURNING assignment_id`,
    [consultantId, clientName, clientBillRate, deletedAt, createdAt]
  )

  return row
}

async function insertManagerLinks(client, managerId, consultantIds, assignedAt) {
  for (const consultantId of consultantIds) {
    await client.query(
      `INSERT INTO line_manager_consultants (
         manager_id,
         consultant_id,
         assigned_at
       )
       VALUES ($1, $2, $3)`,
      [managerId, consultantId, assignedAt]
    )
  }
}

async function insertTimesheet(client, {
  consultantId,
  assignmentId = null,
  weekStart,
  status,
  submittedAt = null,
  submittedLate = false,
  createdAt,
  updatedAt,
}) {
  const { rows: [row] } = await client.query(
    `INSERT INTO timesheets (
       consultant_id,
       assignment_id,
       week_start,
       status,
       submitted_at,
       submitted_late,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING timesheet_id`,
    [
      consultantId,
      assignmentId,
      weekStart,
      status,
      submittedAt,
      submittedLate,
      createdAt,
      updatedAt,
    ]
  )

  return row
}

async function insertReview(client, {
  timesheetId,
  reviewerId,
  decision,
  comment = null,
  reviewDate,
}) {
  await client.query(
    `INSERT INTO reviews (
       timesheet_id,
       reviewer_id,
       decision,
       comment,
       review_date
     )
     VALUES ($1, $2, $3, $4, $5)`,
    [timesheetId, reviewerId, decision, comment, reviewDate]
  )
}

async function insertFinanceReturn(client, {
  timesheetId,
  returnedBy,
  comment,
  createdAt,
}) {
  await client.query(
    `INSERT INTO finance_returns (
       timesheet_id,
       returned_by,
       comment,
       created_at
     )
     VALUES ($1, $2, $3, $4)`,
    [timesheetId, returnedBy, comment, createdAt]
  )
}

async function insertPayment(client, {
  timesheetId,
  processedBy,
  createdAt,
  breakdowns,
}) {
  const totalBillAmount = Number(
    breakdowns.reduce((sum, breakdown) => sum + breakdown.billAmount, 0).toFixed(2)
  )
  const totalPayAmount = Number(
    breakdowns.reduce((sum, breakdown) => sum + breakdown.payAmount, 0).toFixed(2)
  )
  const marginAmount = Number((totalBillAmount - totalPayAmount).toFixed(2))

  const { rows: [payment] } = await client.query(
    `INSERT INTO payments (
       timesheet_id,
       processed_by,
       total_bill_amount,
       total_pay_amount,
       margin_amount,
       status,
       created_at
     )
     VALUES ($1, $2, $3, $4, $5, 'COMPLETED', $6)
     RETURNING payment_id`,
    [
      timesheetId,
      processedBy,
      totalBillAmount,
      totalPayAmount,
      marginAmount,
      createdAt,
    ]
  )

  for (const breakdown of breakdowns) {
    await client.query(
      `INSERT INTO payment_breakdowns (
         payment_id,
         entry_kind,
         assignment_id,
         bucket_label,
         hours_worked,
         bill_rate,
         bill_amount,
         pay_rate,
         pay_amount,
         margin_amount
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        payment.payment_id,
        breakdown.entryKind,
        breakdown.assignmentId ?? null,
        breakdown.bucketLabel,
        breakdown.hoursWorked,
        breakdown.billRate,
        breakdown.billAmount,
        breakdown.payRate,
        breakdown.payAmount,
        breakdown.marginAmount,
      ]
    )
  }

  return {
    totalBillAmount,
    totalPayAmount,
    marginAmount,
  }
}

async function insertFinancialNote(client, {
  timesheetId,
  authoredBy,
  note,
  createdAt,
}) {
  await client.query(
    `INSERT INTO financial_notes (
       timesheet_id,
       authored_by,
       note,
       created_at
     )
     VALUES ($1, $2, $3, $4)`,
    [timesheetId, authoredBy, note, createdAt]
  )
}

async function createTimesheetScenario(client, {
  scenarioLabel,
  consultant,
  manager = null,
  primaryAssignmentId = null,
  weekStart,
  status,
  entries = [],
  createdAt,
  submittedAt = null,
  submittedLate = false,
  review = null,
  financeReturn = null,
  payment = null,
  note = null,
  assignmentsById,
  seededTimesheets,
}) {
  const updatedAt =
    payment?.processedAt ??
    financeReturn?.returnedAt ??
    review?.reviewedAt ??
    submittedAt ??
    createdAt

  const timesheet = await insertTimesheet(client, {
    consultantId: consultant.userId,
    assignmentId: primaryAssignmentId,
    weekStart,
    status,
    submittedAt,
    submittedLate,
    createdAt,
    updatedAt,
  })

  if (entries.length > 0) {
    await insertEntries(client, timesheet.timesheet_id, entries)
  }

  if (submittedAt) {
    await logAudit(
      client,
      'SUBMISSION',
      consultant.userId,
      timesheet.timesheet_id,
      {
        previousStatus: 'DRAFT',
        submittedLate,
        submittedAt,
      },
      submittedAt
    )
  }

  if (review) {
    await insertReview(client, {
      timesheetId: timesheet.timesheet_id,
      reviewerId: review.reviewerId,
      decision: review.decision,
      comment: review.comment ?? null,
      reviewDate: review.reviewedAt,
    })

    await logAudit(
      client,
      review.decision === 'APPROVED' ? 'APPROVAL' : 'REJECTION',
      review.reviewerId,
      timesheet.timesheet_id,
      {
        decision: review.decision,
        comment: review.comment ?? null,
      },
      review.reviewedAt
    )
  }

  if (financeReturn) {
    await insertFinanceReturn(client, {
      timesheetId: timesheet.timesheet_id,
      returnedBy: financeReturn.returnedBy,
      comment: financeReturn.comment,
      createdAt: financeReturn.returnedAt,
    })

    await logAudit(
      client,
      'FINANCE_RETURN',
      financeReturn.returnedBy,
      timesheet.timesheet_id,
      {
        comment: financeReturn.comment,
      },
      financeReturn.returnedAt
    )
  }

  let paymentSummary = null
  if (payment) {
    const breakdowns = buildPaymentBreakdowns({
      entries,
      assignmentsById,
      defaultPayRate: consultant.defaultPayRate,
      rateOverrides: payment.rateOverrides ?? {},
    })

    paymentSummary = await insertPayment(client, {
      timesheetId: timesheet.timesheet_id,
      processedBy: payment.processedBy,
      createdAt: payment.processedAt,
      breakdowns,
    })

    if (note?.text) {
      await insertFinancialNote(client, {
        timesheetId: timesheet.timesheet_id,
        authoredBy: note.authoredBy,
        note: note.text,
        createdAt: note.createdAt,
      })
    }

    await logAudit(
      client,
      'PROCESSING',
      payment.processedBy,
      timesheet.timesheet_id,
      {
        totalBillAmount: paymentSummary.totalBillAmount,
        totalPayAmount: paymentSummary.totalPayAmount,
        marginAmount: paymentSummary.marginAmount,
        totalHours: totalHours(entries),
        breakdowns,
      },
      payment.processedAt
    )
  }

  const workSummary = summariseEntries(entries, assignmentsById)
    .map((item) => item.bucketLabel)
    .join(' + ') || 'No entries yet'

  seededTimesheets.push({
    consultant: consultant.name,
    manager: manager?.name ?? '-',
    weekStart,
    weekEnd: weekEnd(weekStart),
    status,
    hours: formatHours(totalHours(entries)),
    workCategories: workSummary,
    scenario: scenarioLabel,
  })

  return {
    timesheetId: timesheet.timesheet_id,
    paymentSummary,
  }
}

const WEEK_STARTS = Object.freeze({
  thisWeek: monday(0),
  lastWeek: monday(1),
  twoWeeksAgo: monday(2),
  threeWeeksAgo: monday(3),
  fourWeeksAgo: monday(4),
})

const DEMO_ACCOUNT_CREATED_AT = at(monday(10), '09:00:00')
const DEFAULT_PAY_RATES = Object.freeze({
  CONSULTANT: 35,
  LINE_MANAGER: 45,
})

const DEMO_USERS = Object.freeze({
  admin: {
    name: 'Admin Demo',
    email: 'admin@demo.test',
    password: 'admin1234',
    role: 'SYSTEM_ADMIN',
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'User management, role changes, assignment maintenance, audit log walkthrough',
  },
  finance: {
    name: 'Finance Demo',
    email: 'finance@demo.test',
    password: 'finance1234',
    role: 'FINANCE_MANAGER',
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Approved queue, finance returns, payments, notes, and pay-rate review',
  },
  alice: {
    name: 'Alice Manager',
    email: 'alice@demo.test',
    password: 'alice1234',
    role: 'LINE_MANAGER',
    defaultPayRate: DEFAULT_PAY_RATES.LINE_MANAGER,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Approver for Charlie, Diana, Grace, and Ian',
  },
  bob: {
    name: 'Bob Manager',
    email: 'bob@demo.test',
    password: 'bob1234',
    role: 'LINE_MANAGER',
    defaultPayRate: DEFAULT_PAY_RATES.LINE_MANAGER,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Approver for Eve and Frank',
  },
  charlie: {
    name: 'Charlie Consultant',
    email: 'charlie@demo.test',
    password: 'charlie1234',
    role: 'CONSULTANT',
    defaultPayRate: DEFAULT_PAY_RATES.CONSULTANT,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Draft, autofill, late pending review, approved finance queue, archived assignment history',
  },
  diana: {
    name: 'Diana Consultant',
    email: 'diana@demo.test',
    password: 'diana1234',
    role: 'CONSULTANT',
    defaultPayRate: DEFAULT_PAY_RATES.CONSULTANT,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Finance return, approved multi-bucket payment, completed history, finance notes',
  },
  eve: {
    name: 'Eve Consultant',
    email: 'eve@demo.test',
    password: 'eve1234',
    role: 'CONSULTANT',
    defaultPayRate: DEFAULT_PAY_RATES.CONSULTANT,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Rejected sheet with manager feedback plus editable draft follow-up',
  },
  frank: {
    name: 'Frank Consultant',
    email: 'frank@demo.test',
    password: 'frank1234',
    role: 'CONSULTANT',
    defaultPayRate: DEFAULT_PAY_RATES.CONSULTANT,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Fresh pending approval item for a live manager review',
  },
  grace: {
    name: 'Grace Consultant',
    email: 'grace@demo.test',
    password: 'grace1234',
    role: 'CONSULTANT',
    defaultPayRate: DEFAULT_PAY_RATES.CONSULTANT,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Missing-week eligibility demo for current and recent past weeks',
  },
  holly: {
    name: 'Holly Temp',
    email: 'holly@demo.test',
    password: 'holly1234',
    role: 'CONSULTANT',
    defaultPayRate: DEFAULT_PAY_RATES.CONSULTANT,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Disposable admin target for assignment creation, role change, and deletion demos',
  },
  ian: {
    name: 'Ian Submitter Manager',
    email: 'ian@demo.test',
    password: 'ian12345',
    role: 'LINE_MANAGER',
    defaultPayRate: DEFAULT_PAY_RATES.LINE_MANAGER,
    createdAt: DEMO_ACCOUNT_CREATED_AT,
    purpose: 'Line-manager submitter edge case with assignments and timesheet history',
  },
})

const CLIENT_ASSIGNMENT_BLUEPRINTS = Object.freeze([
  {
    key: 'charlieLegacy',
    consultantKey: 'charlie',
    clientName: 'Client A',
    clientBillRate: 55,
    createdAt: at(WEEK_STARTS.fourWeeksAgo, '08:00:00'),
    deletedAt: at(WEEK_STARTS.twoWeeksAgo, '09:00:00'),
  },
  {
    key: 'charlieActive',
    consultantKey: 'charlie',
    clientName: 'Client A',
    clientBillRate: 57,
    createdAt: at(WEEK_STARTS.threeWeeksAgo, '09:30:00'),
  },
  {
    key: 'dianaPrimary',
    consultantKey: 'diana',
    clientName: 'Client B',
    clientBillRate: 60,
    createdAt: at(WEEK_STARTS.fourWeeksAgo, '08:30:00'),
  },
  {
    key: 'dianaSecondary',
    consultantKey: 'diana',
    clientName: 'Client C',
    clientBillRate: 62,
    createdAt: at(WEEK_STARTS.threeWeeksAgo, '08:45:00'),
  },
  {
    key: 'evePrimary',
    consultantKey: 'eve',
    clientName: 'Client D',
    clientBillRate: 52.5,
    createdAt: at(WEEK_STARTS.fourWeeksAgo, '09:00:00'),
  },
  {
    key: 'frankPrimary',
    consultantKey: 'frank',
    clientName: 'Client E',
    clientBillRate: 57.5,
    createdAt: at(WEEK_STARTS.twoWeeksAgo, '10:00:00'),
  },
  {
    key: 'gracePrimary',
    consultantKey: 'grace',
    clientName: 'Client F',
    clientBillRate: 54,
    createdAt: at(WEEK_STARTS.threeWeeksAgo, '11:00:00'),
  },
  {
    key: 'ianPrimary',
    consultantKey: 'ian',
    clientName: 'Client G',
    clientBillRate: 58,
    createdAt: at(WEEK_STARTS.fourWeeksAgo, '11:15:00'),
  },
])

const MANAGER_LINK_BLUEPRINTS = Object.freeze([
  {
    managerKey: 'alice',
    consultantKeys: ['charlie', 'diana', 'grace', 'ian'],
    assignedAt: at(WEEK_STARTS.fourWeeksAgo, '09:00:00'),
  },
  {
    managerKey: 'bob',
    consultantKeys: ['eve', 'frank'],
    assignedAt: at(WEEK_STARTS.fourWeeksAgo, '09:05:00'),
  },
])

function createScenarioBlueprints(assignmentRows) {
  return [
    {
      key: 'charlieHistoricalCompleted',
      scenarioLabel: 'Completed historical sheet against an archived assignment',
      consultantKey: 'charlie',
      managerKey: 'alice',
      primaryAssignmentKey: 'charlieLegacy',
      weekStart: WEEK_STARTS.fourWeeksAgo,
      status: 'COMPLETED',
      entries: clientWeekEntries(
        WEEK_STARTS.fourWeeksAgo,
        assignmentRows.charlieLegacy.assignment_id,
        [8, 8, 7.5, 8, 8, 0, 0]
      ),
      createdAt: at(WEEK_STARTS.fourWeeksAgo, '08:15:00'),
      submittedAt: at(addDays(WEEK_STARTS.fourWeeksAgo, 4), '17:30:00'),
      review: {
        reviewerKey: 'alice',
        decision: 'APPROVED',
        reviewedAt: at(WEEK_STARTS.threeWeeksAgo, '09:15:00'),
      },
      payment: {
        processedByKey: 'finance',
        processedAt: at(addDays(WEEK_STARTS.threeWeeksAgo, 2), '11:00:00'),
      },
      note: {
        authoredByKey: 'finance',
        text: 'Historical payment record using the archived assignment version.',
        createdAt: at(addDays(WEEK_STARTS.threeWeeksAgo, 2), '11:20:00'),
      },
    },
    {
      key: 'charlieApprovedFinanceQueue',
      scenarioLabel: 'Approved client-only sheet waiting for finance',
      consultantKey: 'charlie',
      managerKey: 'alice',
      primaryAssignmentKey: 'charlieActive',
      weekStart: WEEK_STARTS.threeWeeksAgo,
      status: 'APPROVED',
      entries: clientWeekEntries(
        WEEK_STARTS.threeWeeksAgo,
        assignmentRows.charlieActive.assignment_id,
        [8, 8, 8, 8, 8, 0, 0]
      ),
      createdAt: at(WEEK_STARTS.threeWeeksAgo, '08:20:00'),
      submittedAt: at(addDays(WEEK_STARTS.threeWeeksAgo, 4), '17:45:00'),
      review: {
        reviewerKey: 'alice',
        decision: 'APPROVED',
        reviewedAt: at(WEEK_STARTS.twoWeeksAgo, '09:10:00'),
      },
    },
    {
      key: 'charlieLatePending',
      scenarioLabel: 'Late pending sheet with client and internal work for manager review',
      consultantKey: 'charlie',
      managerKey: 'alice',
      primaryAssignmentKey: 'charlieActive',
      weekStart: WEEK_STARTS.lastWeek,
      status: 'PENDING',
      entries: mergeEntries(
        clientWeekEntries(
          WEEK_STARTS.lastWeek,
          assignmentRows.charlieActive.assignment_id,
          [8, 8, 8, 8, 0, 0, 0]
        ),
        internalWeekEntries(WEEK_STARTS.lastWeek, [0, 0, 0, 0, 8, 0, 0])
      ),
      createdAt: at(WEEK_STARTS.lastWeek, '08:25:00'),
      submittedAt: at(WEEK_STARTS.thisWeek, '09:00:00'),
      submittedLate: true,
    },
    {
      key: 'charlieBlankDraft',
      scenarioLabel: 'Blank current-week draft ready for autofill from the previous week',
      consultantKey: 'charlie',
      managerKey: 'alice',
      weekStart: WEEK_STARTS.thisWeek,
      status: 'DRAFT',
      entries: [],
      createdAt: at(WEEK_STARTS.thisWeek, '08:05:00'),
    },
    {
      key: 'dianaFinanceReturned',
      scenarioLabel: 'Finance returned sheet awaiting manager re-review',
      consultantKey: 'diana',
      managerKey: 'alice',
      primaryAssignmentKey: 'dianaPrimary',
      weekStart: WEEK_STARTS.threeWeeksAgo,
      status: 'FINANCE_REJECTED',
      entries: mergeEntries(
        clientWeekEntries(
          WEEK_STARTS.threeWeeksAgo,
          assignmentRows.dianaPrimary.assignment_id,
          [8, 8, 8, 0, 0, 0, 0]
        ),
        internalWeekEntries(WEEK_STARTS.threeWeeksAgo, [0, 0, 0, 8, 8, 0, 0])
      ),
      createdAt: at(WEEK_STARTS.threeWeeksAgo, '08:10:00'),
      submittedAt: at(addDays(WEEK_STARTS.threeWeeksAgo, 4), '17:30:00'),
      review: {
        reviewerKey: 'alice',
        decision: 'APPROVED',
        reviewedAt: at(WEEK_STARTS.twoWeeksAgo, '09:05:00'),
      },
      financeReturn: {
        returnedByKey: 'finance',
        comment: 'Client and internal split needs another manager review before payment.',
        returnedAt: at(WEEK_STARTS.twoWeeksAgo, '11:10:00'),
      },
    },
    {
      key: 'dianaCompletedHistory',
      scenarioLabel: 'Completed multi-category finance history with a note',
      consultantKey: 'diana',
      managerKey: 'alice',
      weekStart: WEEK_STARTS.twoWeeksAgo,
      status: 'COMPLETED',
      entries: mergeEntries(
        clientWeekEntries(
          WEEK_STARTS.twoWeeksAgo,
          assignmentRows.dianaPrimary.assignment_id,
          [8, 8, 0, 0, 0, 0, 0]
        ),
        clientWeekEntries(
          WEEK_STARTS.twoWeeksAgo,
          assignmentRows.dianaSecondary.assignment_id,
          [0, 0, 8, 8, 4, 0, 0]
        ),
        internalWeekEntries(WEEK_STARTS.twoWeeksAgo, [0, 0, 0, 0, 4, 0, 0])
      ),
      createdAt: at(WEEK_STARTS.twoWeeksAgo, '08:15:00'),
      submittedAt: at(addDays(WEEK_STARTS.twoWeeksAgo, 4), '17:20:00'),
      review: {
        reviewerKey: 'alice',
        decision: 'APPROVED',
        reviewedAt: at(WEEK_STARTS.lastWeek, '09:20:00'),
      },
      payment: {
        processedByKey: 'finance',
        processedAt: at(addDays(WEEK_STARTS.lastWeek, 1), '14:00:00'),
      },
      note: {
        authoredByKey: 'finance',
        text: 'Completed example with two generic clients plus internal time for the finance demo.',
        createdAt: at(addDays(WEEK_STARTS.lastWeek, 1), '14:20:00'),
      },
    },
    {
      key: 'dianaApprovedToPay',
      scenarioLabel: 'Approved multi-category sheet waiting for payment processing',
      consultantKey: 'diana',
      managerKey: 'alice',
      weekStart: WEEK_STARTS.lastWeek,
      status: 'APPROVED',
      entries: mergeEntries(
        clientWeekEntries(
          WEEK_STARTS.lastWeek,
          assignmentRows.dianaPrimary.assignment_id,
          [8, 8, 8, 0, 0, 0, 0]
        ),
        clientWeekEntries(
          WEEK_STARTS.lastWeek,
          assignmentRows.dianaSecondary.assignment_id,
          [0, 0, 0, 8, 0, 0, 0]
        ),
        internalWeekEntries(WEEK_STARTS.lastWeek, [0, 0, 0, 0, 8, 0, 0])
      ),
      createdAt: at(WEEK_STARTS.lastWeek, '08:30:00'),
      submittedAt: at(addDays(WEEK_STARTS.lastWeek, 4), '17:50:00'),
      review: {
        reviewerKey: 'alice',
        decision: 'APPROVED',
        reviewedAt: at(WEEK_STARTS.thisWeek, '09:10:00'),
      },
    },
    {
      key: 'eveRejected',
      scenarioLabel: 'Rejected sheet with manager comment visible to the consultant',
      consultantKey: 'eve',
      managerKey: 'bob',
      primaryAssignmentKey: 'evePrimary',
      weekStart: WEEK_STARTS.lastWeek,
      status: 'REJECTED',
      entries: clientWeekEntries(
        WEEK_STARTS.lastWeek,
        assignmentRows.evePrimary.assignment_id,
        [8, 8, 0, 8, 8, 0, 0]
      ),
      createdAt: at(WEEK_STARTS.lastWeek, '08:10:00'),
      submittedAt: at(addDays(WEEK_STARTS.lastWeek, 4), '16:45:00'),
      review: {
        reviewerKey: 'bob',
        decision: 'REJECTED',
        comment: 'Wednesday is blank. Please add the missing client hours and resubmit.',
        reviewedAt: at(WEEK_STARTS.thisWeek, '10:00:00'),
      },
    },
    {
      key: 'eveEditableDraft',
      scenarioLabel: 'Editable current-week draft for consultant status tracking',
      consultantKey: 'eve',
      managerKey: 'bob',
      primaryAssignmentKey: 'evePrimary',
      weekStart: WEEK_STARTS.thisWeek,
      status: 'DRAFT',
      entries: clientWeekEntries(
        WEEK_STARTS.thisWeek,
        assignmentRows.evePrimary.assignment_id,
        [8, 7.5, 8, 0, 0, 0, 0]
      ),
      createdAt: at(WEEK_STARTS.thisWeek, '08:25:00'),
    },
    {
      key: 'frankPendingReview',
      scenarioLabel: 'Current pending review item for Bob to approve live',
      consultantKey: 'frank',
      managerKey: 'bob',
      primaryAssignmentKey: 'frankPrimary',
      weekStart: WEEK_STARTS.thisWeek,
      status: 'PENDING',
      entries: clientWeekEntries(
        WEEK_STARTS.thisWeek,
        assignmentRows.frankPrimary.assignment_id,
        [8, 8, 8, 8, 8, 0, 0]
      ),
      createdAt: at(WEEK_STARTS.thisWeek, '08:35:00'),
      submittedAt: at(addDays(WEEK_STARTS.thisWeek, 5), '09:30:00'),
    },
    {
      key: 'graceCompletedHistory',
      scenarioLabel: 'Completed history while current and last week remain missing',
      consultantKey: 'grace',
      managerKey: 'alice',
      primaryAssignmentKey: 'gracePrimary',
      weekStart: WEEK_STARTS.twoWeeksAgo,
      status: 'COMPLETED',
      entries: clientWeekEntries(
        WEEK_STARTS.twoWeeksAgo,
        assignmentRows.gracePrimary.assignment_id,
        [7.5, 7.5, 7.5, 7.5, 7.5, 0, 0]
      ),
      createdAt: at(WEEK_STARTS.twoWeeksAgo, '08:05:00'),
      submittedAt: at(addDays(WEEK_STARTS.twoWeeksAgo, 4), '17:00:00'),
      review: {
        reviewerKey: 'alice',
        decision: 'APPROVED',
        reviewedAt: at(WEEK_STARTS.lastWeek, '09:05:00'),
      },
      payment: {
        processedByKey: 'finance',
        processedAt: at(addDays(WEEK_STARTS.lastWeek, 1), '15:00:00'),
      },
    },
    {
      key: 'ianCompletedHistory',
      scenarioLabel: 'Line-manager submitter completed history item',
      consultantKey: 'ian',
      managerKey: 'alice',
      primaryAssignmentKey: 'ianPrimary',
      weekStart: WEEK_STARTS.twoWeeksAgo,
      status: 'COMPLETED',
      entries: mergeEntries(
        clientWeekEntries(
          WEEK_STARTS.twoWeeksAgo,
          assignmentRows.ianPrimary.assignment_id,
          [8, 8, 8, 8, 0, 0, 0]
        ),
        internalWeekEntries(WEEK_STARTS.twoWeeksAgo, [0, 0, 0, 0, 8, 0, 0])
      ),
      createdAt: at(WEEK_STARTS.twoWeeksAgo, '08:40:00'),
      submittedAt: at(addDays(WEEK_STARTS.twoWeeksAgo, 4), '17:10:00'),
      review: {
        reviewerKey: 'alice',
        decision: 'APPROVED',
        reviewedAt: at(WEEK_STARTS.lastWeek, '09:45:00'),
      },
      payment: {
        processedByKey: 'finance',
        processedAt: at(addDays(WEEK_STARTS.lastWeek, 2), '13:10:00'),
      },
      note: {
        authoredByKey: 'finance',
        text: 'Completed edge-case history for a line-manager submitter.',
        createdAt: at(addDays(WEEK_STARTS.lastWeek, 2), '13:30:00'),
      },
    },
    {
      key: 'ianPendingReview',
      scenarioLabel: 'Line-manager submitter pending approval item',
      consultantKey: 'ian',
      managerKey: 'alice',
      primaryAssignmentKey: 'ianPrimary',
      weekStart: WEEK_STARTS.thisWeek,
      status: 'PENDING',
      entries: clientWeekEntries(
        WEEK_STARTS.thisWeek,
        assignmentRows.ianPrimary.assignment_id,
        [8, 8, 8, 8, 8, 0, 0]
      ),
      createdAt: at(WEEK_STARTS.thisWeek, '08:50:00'),
      submittedAt: at(addDays(WEEK_STARTS.thisWeek, 5), '11:00:00'),
    },
  ]
}

function materialiseScenario(
  blueprint,
  users,
  assignmentRows,
  assignmentsById,
  seededTimesheets
) {
  return {
    scenarioLabel: blueprint.scenarioLabel,
    consultant: users[blueprint.consultantKey],
    manager: blueprint.managerKey ? users[blueprint.managerKey] : null,
    primaryAssignmentId: blueprint.primaryAssignmentKey
      ? assignmentRows[blueprint.primaryAssignmentKey].assignment_id
      : null,
    weekStart: blueprint.weekStart,
    status: blueprint.status,
    entries: blueprint.entries,
    createdAt: blueprint.createdAt,
    submittedAt: blueprint.submittedAt ?? null,
    submittedLate: blueprint.submittedLate ?? false,
    review: blueprint.review
      ? {
          reviewerId: users[blueprint.review.reviewerKey].userId,
          decision: blueprint.review.decision,
          comment: blueprint.review.comment ?? null,
          reviewedAt: blueprint.review.reviewedAt,
        }
      : null,
    financeReturn: blueprint.financeReturn
      ? {
          returnedBy: users[blueprint.financeReturn.returnedByKey].userId,
          comment: blueprint.financeReturn.comment,
          returnedAt: blueprint.financeReturn.returnedAt,
        }
      : null,
    payment: blueprint.payment
      ? {
          processedBy: users[blueprint.payment.processedByKey].userId,
          processedAt: blueprint.payment.processedAt,
          rateOverrides: blueprint.payment.rateOverrides ?? {},
        }
      : null,
    note: blueprint.note
      ? {
          authoredBy: users[blueprint.note.authoredByKey].userId,
          text: blueprint.note.text,
          createdAt: blueprint.note.createdAt,
        }
      : null,
    assignmentsById,
    seededTimesheets,
    consultantKey: blueprint.consultantKey,
    primaryAssignmentKey: blueprint.primaryAssignmentKey ?? null,
  }
}

function createEmptyCoverageState() {
  return {
    statuses: new Set(),
    payments: 0,
    financialNotes: 0,
    financeReturns: 0,
    archivedAssignmentTimesheets: 0,
    timesheetsByConsultant: new Map(),
  }
}

function recordCoverage(coverage, {
  consultantKey,
  status,
  weekStart,
  payment,
  note,
  financeReturn,
  primaryAssignmentKey,
  archivedAssignmentKeys,
}) {
  coverage.statuses.add(status)

  if (!coverage.timesheetsByConsultant.has(consultantKey)) {
    coverage.timesheetsByConsultant.set(consultantKey, new Set())
  }
  coverage.timesheetsByConsultant.get(consultantKey).add(weekStart)

  if (payment) coverage.payments += 1
  if (note?.text) coverage.financialNotes += 1
  if (financeReturn) coverage.financeReturns += 1
  if (primaryAssignmentKey && archivedAssignmentKeys.has(primaryAssignmentKey)) {
    coverage.archivedAssignmentTimesheets += 1
  }
}

function createPresentationGuide() {
  return [
    {
      area: 'Admin',
      account: DEMO_USERS.admin.email,
      focus: 'Create or delete assignments for Holly, change a role, adjust manager links, and inspect the audit log',
      requirements: 'FR-1 to FR-8, FR-41',
    },
    {
      area: 'Consultant',
      account: DEMO_USERS.charlie.email,
      focus: `Open ${WEEK_STARTS.thisWeek} draft, autofill from ${WEEK_STARTS.lastWeek}, edit, submit, and compare against archived assignment history`,
      requirements: 'FR-9 to FR-21, FR-29',
    },
    {
      area: 'Consultant',
      account: DEMO_USERS.eve.email,
      focus: `Open rejected week ${WEEK_STARTS.lastWeek}, read manager feedback, correct it, and resubmit`,
      requirements: 'FR-15 to FR-20, FR-36, FR-38',
    },
    {
      area: 'Consultant',
      account: DEMO_USERS.grace.email,
      focus: 'Create the current week and a missing past week from the previous four-week window',
      requirements: 'FR-9, FR-16, FR-18, FR-21',
    },
    {
      area: 'Manager',
      account: DEMO_USERS.alice.email,
      focus: `Review Charlie's late pending week ${WEEK_STARTS.lastWeek}, re-review Diana's finance-returned week, and inspect Ian's line-manager-submitter trail`,
      requirements: 'FR-22 to FR-29, FR-38',
    },
    {
      area: 'Manager',
      account: DEMO_USERS.bob.email,
      focus: `Approve Frank's current pending sheet or inspect Eve's rejection trail`,
      requirements: 'FR-22 to FR-29, FR-36',
    },
    {
      area: 'Finance',
      account: DEMO_USERS.finance.email,
      focus: `Process Diana's approved week ${WEEK_STARTS.lastWeek}, review completed history and notes, and confirm standardised pay rates`,
      requirements: 'FR-30 to FR-38',
    },
  ]
}

function assertCoverage(condition, message) {
  if (!condition) {
    throw new Error(`Coverage check failed: ${message}`)
  }
}

function validateSeedCoverage({
  coverage,
  seededAssignments,
  seededManagerLinks,
  users,
  ianUserId,
}) {
  const requiredStatuses = ['DRAFT', 'PENDING', 'APPROVED', 'FINANCE_REJECTED', 'REJECTED', 'COMPLETED']
  for (const status of requiredStatuses) {
    assertCoverage(coverage.statuses.has(status), `missing a seeded ${status} timesheet`)
  }

  assertCoverage(coverage.payments > 0, 'missing a processed payment scenario')
  assertCoverage(coverage.financialNotes > 0, 'missing a finance note scenario')
  assertCoverage(coverage.financeReturns > 0, 'missing a finance return scenario')
  assertCoverage(coverage.archivedAssignmentTimesheets > 0, 'missing archived assignment history')
  assertCoverage(
    seededAssignments.some((assignment) => assignment.archived === 'Yes'),
    'missing an archived assignment record'
  )
  assertCoverage(
    seededManagerLinks.some(
      (link) => link.manager === users.alice.name && link.submitter === users.ian.name
    ),
    'missing the line-manager submitter approval link for Ian'
  )
  assertCoverage(
    seededAssignments.some(
      (assignment) => assignment.consultant === users.ian.name && assignment.client === 'Client G'
    ),
    'missing the line-manager submitter client assignment'
  )
  assertCoverage(
    (coverage.timesheetsByConsultant.get('ian')?.size ?? 0) >= 2,
    'missing line-manager submitter timesheet history'
  )

  const graceWeeks = coverage.timesheetsByConsultant.get('grace') ?? new Set()
  assertCoverage(
    !graceWeeks.has(WEEK_STARTS.thisWeek) && !graceWeeks.has(WEEK_STARTS.lastWeek),
    'missing a consultant with eligible current and past weeks to create'
  )
  assertCoverage(
    ianUserId != null,
    'line-manager submitter user was not created'
  )
}

const passwordHashes = Object.fromEntries(
  await Promise.all(
    Object.entries(DEMO_USERS).map(async ([key, user]) => [
      key,
      await bcrypt.hash(user.password, SALT_ROUNDS),
    ])
  )
)

const seededAccounts = Object.values(DEMO_USERS).map((user) => ({
  role: user.role,
  name: user.name,
  email: user.email,
  password: user.password,
  defaultPayRate:
    user.defaultPayRate == null ? '-' : `£${Number(user.defaultPayRate).toFixed(2)}/hr`,
  purpose: user.purpose,
}))

const seededAssignments = []
const seededManagerLinks = []
const seededTimesheets = []
const coverage = createEmptyCoverageState()

const client = await pool.connect()
try {
  await client.query('BEGIN')

  await client.query(`
    TRUNCATE audit_reports, financial_notes, payment_breakdowns, payments, reviews,
             timesheet_entries, timesheets, line_manager_consultants,
             client_assignments, users
    CASCADE
  `)

  const users = {}
  for (const [key, user] of Object.entries(DEMO_USERS)) {
    const inserted = await insertUser(client, user, passwordHashes[key])
    users[key] = {
      ...user,
      userId: inserted.user_id,
    }
  }

  const assignmentRows = {}
  for (const blueprint of CLIENT_ASSIGNMENT_BLUEPRINTS) {
    const row = await insertAssignment(client, {
      consultantId: users[blueprint.consultantKey].userId,
      clientName: blueprint.clientName,
      clientBillRate: blueprint.clientBillRate,
      createdAt: blueprint.createdAt,
      deletedAt: blueprint.deletedAt ?? null,
    })

    assignmentRows[blueprint.key] = row
    seededAssignments.push({
      consultant: users[blueprint.consultantKey].name,
      client: blueprint.clientName,
      billRate: `£${Number(blueprint.clientBillRate).toFixed(2)}/hr`,
      archived: blueprint.deletedAt ? 'Yes' : 'No',
    })
  }

  const assignmentsById = new Map(
    CLIENT_ASSIGNMENT_BLUEPRINTS.map((blueprint) => [
      assignmentRows[blueprint.key].assignment_id,
      {
        clientName: blueprint.clientName,
        clientBillRate: blueprint.clientBillRate,
      },
    ])
  )

  for (const linkBlueprint of MANAGER_LINK_BLUEPRINTS) {
    const consultantIds = linkBlueprint.consultantKeys.map((key) => users[key].userId)
    await insertManagerLinks(
      client,
      users[linkBlueprint.managerKey].userId,
      consultantIds,
      linkBlueprint.assignedAt
    )

    for (const consultantKey of linkBlueprint.consultantKeys) {
      seededManagerLinks.push({
        manager: users[linkBlueprint.managerKey].name,
        submitter: users[consultantKey].name,
        submitterRole: users[consultantKey].role,
        assignedAt: linkBlueprint.assignedAt,
      })
    }
  }

  const archivedAssignmentKeys = new Set(
    CLIENT_ASSIGNMENT_BLUEPRINTS.filter((blueprint) => blueprint.deletedAt).map((blueprint) => blueprint.key)
  )

  const scenarioBlueprints = createScenarioBlueprints(assignmentRows)
  for (const blueprint of scenarioBlueprints) {
    await createTimesheetScenario(
      client,
      materialiseScenario(blueprint, users, assignmentRows, assignmentsById, seededTimesheets)
    )

    recordCoverage(coverage, {
      consultantKey: blueprint.consultantKey,
      status: blueprint.status,
      weekStart: blueprint.weekStart,
      payment: blueprint.payment,
      note: blueprint.note,
      financeReturn: blueprint.financeReturn,
      primaryAssignmentKey: blueprint.primaryAssignmentKey ?? null,
      archivedAssignmentKeys,
    })
  }

  await client.query('COMMIT')

  validateSeedCoverage({
    coverage,
    seededAssignments,
    seededManagerLinks,
    users,
    ianUserId: users.ian.userId,
  })

  const presentationGuide = createPresentationGuide()

  console.log('\nSeed complete\n')
  console.log('Demo accounts:')
  console.table(seededAccounts)
  console.log('Seeded assignments:')
  console.table(seededAssignments)
  console.log('Manager approvals:')
  console.table(seededManagerLinks)
  console.log('Seeded timesheet scenarios:')
  console.table(seededTimesheets)
  console.log('Presentation guide:')
  console.table(presentationGuide)
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Seed failed:', err.message)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
