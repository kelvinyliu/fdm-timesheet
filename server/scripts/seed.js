#!/usr/bin/env node
// Populates the DB with easy-to-verify demo data for local testing.
// Usage: node scripts/seed.js
// WARNING: Clears all existing data before seeding.

import bcrypt from 'bcrypt'
import pg from 'pg'
import 'dotenv/config'

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

const SALT_ROUNDS = 10

// Mondays relative to today (UTC)
function monday(weeksAgo = 0) {
  const d = new Date()
  const offset = (d.getUTCDay() + 6) % 7
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - offset - weeksAgo * 7)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function weekEnd(weekStart) {
  return addDays(weekStart, 6)
}

function normaliseWeekHours(hoursPerDay = [8, 8, 8, 8, 8, 0, 0]) {
  return Array.from({ length: 7 }, (_, i) => hoursPerDay[i] ?? 0)
}

// Mon-Sun entries for a given week start. Missing days are filled with 0 hours.
function weekEntries(weekStart, hoursPerDay = [8, 8, 8, 8, 8, 0, 0]) {
  return normaliseWeekHours(hoursPerDay).map((hours, i) => ({
    date: addDays(weekStart, i),
    hours,
  }))
}

function totalHours(hoursPerDay) {
  return normaliseWeekHours(hoursPerDay).reduce((sum, hours) => sum + hours, 0)
}

function formatHours(hours) {
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1)
}

async function insertEntries(client, timesheetId, entries) {
  for (const { date, hours } of entries) {
    await client.query(
      `INSERT INTO timesheet_entries (timesheet_id, entry_date, hours_worked)
       VALUES ($1, $2, $3)`,
      [timesheetId, date, hours]
    )
  }
}

async function logAudit(client, action, performedBy, timesheetId, detail) {
  await client.query(
    `INSERT INTO audit_reports (action, performed_by, timesheet_id, detail)
     VALUES ($1, $2, $3, $4)`,
    [action, performedBy, timesheetId, JSON.stringify(detail)]
  )
}

async function insertUser(client, user, passwordHash) {
  const { rows: [row] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id`,
    [user.name, user.email, passwordHash, user.role]
  )
  return row
}

const WEEK_STARTS = Object.freeze({
  thisWeek: monday(0),
  lastWeek: monday(1),
  twoWeeksAgo: monday(2),
  threeWeeksAgo: monday(3),
})

const DEMO_USERS = Object.freeze({
  admin: {
    name: 'Admin Demo',
    email: 'admin@demo.test',
    password: 'admin1234',
    role: 'SYSTEM_ADMIN',
  },
  finance: {
    name: 'Finance Demo',
    email: 'finance@demo.test',
    password: 'finance1234',
    role: 'FINANCE_MANAGER',
  },
  alice: {
    name: 'Alice Manager',
    email: 'alice@demo.test',
    password: 'alice1234',
    role: 'LINE_MANAGER',
  },
  bob: {
    name: 'Bob Manager',
    email: 'bob@demo.test',
    password: 'bob1234',
    role: 'LINE_MANAGER',
  },
  charlie: {
    name: 'Charlie Consultant',
    email: 'charlie@demo.test',
    password: 'charlie1234',
    role: 'CONSULTANT',
  },
  diana: {
    name: 'Diana Consultant',
    email: 'diana@demo.test',
    password: 'diana1234',
    role: 'CONSULTANT',
  },
  eve: {
    name: 'Eve Consultant',
    email: 'eve@demo.test',
    password: 'eve1234',
    role: 'CONSULTANT',
  },
  frank: {
    name: 'Frank Consultant',
    email: 'frank@demo.test',
    password: 'frank1234',
    role: 'CONSULTANT',
  },
})

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
}))

const seededTimesheets = []

const client = await pool.connect()
try {
  await client.query('BEGIN')

  // -- Clear existing data --------------------------------------------------
  await client.query(`
    TRUNCATE audit_reports, financial_notes, payments, reviews,
             timesheet_entries, timesheets, line_manager_consultants,
             client_assignments, users
    CASCADE
  `)

  // -- Users ----------------------------------------------------------------
  await insertUser(client, DEMO_USERS.admin, passwordHashes.admin)
  const finance = await insertUser(client, DEMO_USERS.finance, passwordHashes.finance)
  const alice = await insertUser(client, DEMO_USERS.alice, passwordHashes.alice)
  const bob = await insertUser(client, DEMO_USERS.bob, passwordHashes.bob)
  const charlie = await insertUser(client, DEMO_USERS.charlie, passwordHashes.charlie)
  const diana = await insertUser(client, DEMO_USERS.diana, passwordHashes.diana)
  const eve = await insertUser(client, DEMO_USERS.eve, passwordHashes.eve)
  const frank = await insertUser(client, DEMO_USERS.frank, passwordHashes.frank)

  // -- Client assignments ---------------------------------------------------
  const { rows: [charlieAssign] } = await client.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate) VALUES ($1,$2,$3) RETURNING assignment_id`,
    [charlie.user_id, 'Barclays Platform', 55.00]
  )
  const { rows: [dianaAssign] } = await client.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate) VALUES ($1,$2,$3) RETURNING assignment_id`,
    [diana.user_id, 'HSBC Mobile', 60.00]
  )
  const { rows: [eveAssign] } = await client.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate) VALUES ($1,$2,$3) RETURNING assignment_id`,
    [eve.user_id, 'Lloyds Reporting', 52.50]
  )
  const { rows: [frankAssign] } = await client.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate) VALUES ($1,$2,$3) RETURNING assignment_id`,
    [frank.user_id, 'NatWest Migration', 57.50]
  )

  // -- Manager -> consultant links ------------------------------------------
  await client.query(
    `INSERT INTO line_manager_consultants (manager_id, consultant_id) VALUES ($1,$2),($1,$3)`,
    [alice.user_id, charlie.user_id, diana.user_id]
  )
  await client.query(
    `INSERT INTO line_manager_consultants (manager_id, consultant_id) VALUES ($1,$2),($1,$3)`,
    [bob.user_id, eve.user_id, frank.user_id]
  )

  // -- Charlie's timesheets (Barclays Platform) -----------------------------
  const c3Hours = [8, 8, 7.5, 8, 8]
  const { rows: [c3] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'COMPLETED') RETURNING timesheet_id`,
    [charlie.user_id, charlieAssign.assignment_id, WEEK_STARTS.threeWeeksAgo]
  )
  await insertEntries(client, c3.timesheet_id, weekEntries(WEEK_STARTS.threeWeeksAgo, c3Hours))
  await client.query(
    `INSERT INTO reviews (timesheet_id, reviewer_id, decision) VALUES ($1,$2,'APPROVED')`,
    [c3.timesheet_id, alice.user_id]
  )
  await client.query(
    `INSERT INTO payments (timesheet_id, processed_by, daily_rate, amount, status)
     VALUES ($1,$2,$3,$4,'COMPLETED')`,
    [c3.timesheet_id, finance.user_id, 440.00, 2172.50]
  )
  await logAudit(client, 'SUBMISSION', charlie.user_id, c3.timesheet_id, { previousStatus: 'DRAFT' })
  await logAudit(client, 'APPROVAL', alice.user_id, c3.timesheet_id, { decision: 'APPROVED' })
  await logAudit(client, 'PROCESSING', finance.user_id, c3.timesheet_id, { dailyRate: 440.00, amount: 2172.50, totalHours: 39.5 })
  seededTimesheets.push({
    consultant: DEMO_USERS.charlie.name,
    manager: DEMO_USERS.alice.name,
    client: 'Barclays Platform',
    weekStart: WEEK_STARTS.threeWeeksAgo,
    weekEnd: weekEnd(WEEK_STARTS.threeWeeksAgo),
    status: 'COMPLETED',
    hours: formatHours(totalHours(c3Hours)),
  })

  const c2Hours = [8, 8, 8, 8, 7]
  const { rows: [c2] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'APPROVED') RETURNING timesheet_id`,
    [charlie.user_id, charlieAssign.assignment_id, WEEK_STARTS.twoWeeksAgo]
  )
  await insertEntries(client, c2.timesheet_id, weekEntries(WEEK_STARTS.twoWeeksAgo, c2Hours))
  await client.query(
    `INSERT INTO reviews (timesheet_id, reviewer_id, decision) VALUES ($1,$2,'APPROVED')`,
    [c2.timesheet_id, alice.user_id]
  )
  await logAudit(client, 'SUBMISSION', charlie.user_id, c2.timesheet_id, { previousStatus: 'DRAFT' })
  await logAudit(client, 'APPROVAL', alice.user_id, c2.timesheet_id, { decision: 'APPROVED' })
  seededTimesheets.push({
    consultant: DEMO_USERS.charlie.name,
    manager: DEMO_USERS.alice.name,
    client: 'Barclays Platform',
    weekStart: WEEK_STARTS.twoWeeksAgo,
    weekEnd: weekEnd(WEEK_STARTS.twoWeeksAgo),
    status: 'APPROVED',
    hours: formatHours(totalHours(c2Hours)),
  })

  const c1Hours = [8, 8, 8, 8, 8]
  const { rows: [c1] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'PENDING') RETURNING timesheet_id`,
    [charlie.user_id, charlieAssign.assignment_id, WEEK_STARTS.lastWeek]
  )
  await insertEntries(client, c1.timesheet_id, weekEntries(WEEK_STARTS.lastWeek, c1Hours))
  await logAudit(client, 'SUBMISSION', charlie.user_id, c1.timesheet_id, { previousStatus: 'DRAFT' })
  seededTimesheets.push({
    consultant: DEMO_USERS.charlie.name,
    manager: DEMO_USERS.alice.name,
    client: 'Barclays Platform',
    weekStart: WEEK_STARTS.lastWeek,
    weekEnd: weekEnd(WEEK_STARTS.lastWeek),
    status: 'PENDING',
    hours: formatHours(totalHours(c1Hours)),
  })

  const c0Hours = [8, 7.5, 0, 0, 0]
  const { rows: [c0] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'DRAFT') RETURNING timesheet_id`,
    [charlie.user_id, charlieAssign.assignment_id, WEEK_STARTS.thisWeek]
  )
  await insertEntries(client, c0.timesheet_id, weekEntries(WEEK_STARTS.thisWeek, c0Hours))
  seededTimesheets.push({
    consultant: DEMO_USERS.charlie.name,
    manager: DEMO_USERS.alice.name,
    client: 'Barclays Platform',
    weekStart: WEEK_STARTS.thisWeek,
    weekEnd: weekEnd(WEEK_STARTS.thisWeek),
    status: 'DRAFT',
    hours: formatHours(totalHours(c0Hours)),
  })

  // -- Diana's timesheets (HSBC Mobile) -------------------------------------
  const d1Hours = [8, 8, 8, 8, 8]
  const { rows: [d1] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'APPROVED') RETURNING timesheet_id`,
    [diana.user_id, dianaAssign.assignment_id, WEEK_STARTS.lastWeek]
  )
  await insertEntries(client, d1.timesheet_id, weekEntries(WEEK_STARTS.lastWeek, d1Hours))
  await client.query(
    `INSERT INTO reviews (timesheet_id, reviewer_id, decision) VALUES ($1,$2,'APPROVED')`,
    [d1.timesheet_id, alice.user_id]
  )
  await logAudit(client, 'SUBMISSION', diana.user_id, d1.timesheet_id, { previousStatus: 'DRAFT' })
  await logAudit(client, 'APPROVAL', alice.user_id, d1.timesheet_id, { decision: 'APPROVED' })
  seededTimesheets.push({
    consultant: DEMO_USERS.diana.name,
    manager: DEMO_USERS.alice.name,
    client: 'HSBC Mobile',
    weekStart: WEEK_STARTS.lastWeek,
    weekEnd: weekEnd(WEEK_STARTS.lastWeek),
    status: 'APPROVED',
    hours: formatHours(totalHours(d1Hours)),
  })

  const d0Hours = [8, 8, 8, 0, 0]
  const { rows: [d0] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'DRAFT') RETURNING timesheet_id`,
    [diana.user_id, dianaAssign.assignment_id, WEEK_STARTS.thisWeek]
  )
  await insertEntries(client, d0.timesheet_id, weekEntries(WEEK_STARTS.thisWeek, d0Hours))
  seededTimesheets.push({
    consultant: DEMO_USERS.diana.name,
    manager: DEMO_USERS.alice.name,
    client: 'HSBC Mobile',
    weekStart: WEEK_STARTS.thisWeek,
    weekEnd: weekEnd(WEEK_STARTS.thisWeek),
    status: 'DRAFT',
    hours: formatHours(totalHours(d0Hours)),
  })

  // -- Eve's timesheets (Lloyds Reporting) ----------------------------------
  const e1Hours = [8, 8, 0, 8, 8]
  const { rows: [e1] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'REJECTED') RETURNING timesheet_id`,
    [eve.user_id, eveAssign.assignment_id, WEEK_STARTS.lastWeek]
  )
  await insertEntries(client, e1.timesheet_id, weekEntries(WEEK_STARTS.lastWeek, e1Hours))
  await client.query(
    `INSERT INTO reviews (timesheet_id, reviewer_id, decision, comment) VALUES ($1,$2,'REJECTED',$3)`,
    [e1.timesheet_id, bob.user_id, 'Wednesday hours are missing. Please correct and resubmit.']
  )
  await logAudit(client, 'SUBMISSION', eve.user_id, e1.timesheet_id, { previousStatus: 'DRAFT' })
  await logAudit(client, 'REJECTION', bob.user_id, e1.timesheet_id, {
    decision: 'REJECTED',
    comment: 'Wednesday hours are missing. Please correct and resubmit.',
  })
  seededTimesheets.push({
    consultant: DEMO_USERS.eve.name,
    manager: DEMO_USERS.bob.name,
    client: 'Lloyds Reporting',
    weekStart: WEEK_STARTS.lastWeek,
    weekEnd: weekEnd(WEEK_STARTS.lastWeek),
    status: 'REJECTED',
    hours: formatHours(totalHours(e1Hours)),
  })

  const e0Hours = [8, 8, 8, 7.5, 0]
  const { rows: [e0] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'DRAFT') RETURNING timesheet_id`,
    [eve.user_id, eveAssign.assignment_id, WEEK_STARTS.thisWeek]
  )
  await insertEntries(client, e0.timesheet_id, weekEntries(WEEK_STARTS.thisWeek, e0Hours))
  seededTimesheets.push({
    consultant: DEMO_USERS.eve.name,
    manager: DEMO_USERS.bob.name,
    client: 'Lloyds Reporting',
    weekStart: WEEK_STARTS.thisWeek,
    weekEnd: weekEnd(WEEK_STARTS.thisWeek),
    status: 'DRAFT',
    hours: formatHours(totalHours(e0Hours)),
  })

  // -- Frank's timesheets (NatWest Migration) -------------------------------
  const f0Hours = [8, 8, 8, 8, 8]
  const { rows: [f0] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'PENDING') RETURNING timesheet_id`,
    [frank.user_id, frankAssign.assignment_id, WEEK_STARTS.thisWeek]
  )
  await insertEntries(client, f0.timesheet_id, weekEntries(WEEK_STARTS.thisWeek, f0Hours))
  await logAudit(client, 'SUBMISSION', frank.user_id, f0.timesheet_id, { previousStatus: 'DRAFT' })
  seededTimesheets.push({
    consultant: DEMO_USERS.frank.name,
    manager: DEMO_USERS.bob.name,
    client: 'NatWest Migration',
    weekStart: WEEK_STARTS.thisWeek,
    weekEnd: weekEnd(WEEK_STARTS.thisWeek),
    status: 'PENDING',
    hours: formatHours(totalHours(f0Hours)),
  })

  // -- Financial notes ------------------------------------------------------
  await client.query(
    `INSERT INTO financial_notes (timesheet_id, authored_by, note) VALUES ($1,$2,$3)`,
    [
      c3.timesheet_id,
      finance.user_id,
      `Payment processed for ${WEEK_STARTS.threeWeeksAgo} to ${weekEnd(WEEK_STARTS.threeWeeksAgo)} at GBP 440/day.`,
    ]
  )

  await client.query('COMMIT')

  console.log('\nSeed complete\n')
  console.log('Demo accounts:')
  console.table(seededAccounts)
  console.log('Seeded timesheet scenarios:')
  console.table(seededTimesheets)
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Seed failed:', err.message)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
