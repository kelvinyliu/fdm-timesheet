#!/usr/bin/env node
// Populates the DB with realistic demo data for prototype presentations.
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
const DEFAULT_PASSWORD = 'temp'

// Mondays relative to today (UTC)
function monday(weeksAgo = 0) {
  const d = new Date()
  const offset = (d.getUTCDay() + 6) % 7
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() - offset - weeksAgo * 7)
  return d.toISOString().slice(0, 10)
}

// Mon–Fri entries for a given week start
function weekEntries(weekStart, hoursPerDay = [8, 8, 8, 8, 8]) {
  return hoursPerDay.map((h, i) => {
    const d = new Date(weekStart + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() + i)
    return { date: d.toISOString().slice(0, 10), hours: h }
  })
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

const hash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)

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
  const { rows: [admin] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'SYSTEM_ADMIN') RETURNING user_id`,
    ['Admin User', 'admin@fdm.com', hash]
  )
  const { rows: [finance] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'FINANCE_MANAGER') RETURNING user_id`,
    ['Finance Manager', 'finance@fdm.com', hash]
  )
  const { rows: [alice] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'LINE_MANAGER') RETURNING user_id`,
    ['Alice Hartley', 'alice@fdm.com', hash]
  )
  const { rows: [bob] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'LINE_MANAGER') RETURNING user_id`,
    ['Bob Chen', 'bob@fdm.com', hash]
  )
  const { rows: [charlie] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'CONSULTANT') RETURNING user_id`,
    ['Charlie Okafor', 'charlie@fdm.com', hash]
  )
  const { rows: [diana] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'CONSULTANT') RETURNING user_id`,
    ['Diana Patel', 'diana@fdm.com', hash]
  )
  const { rows: [eve] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'CONSULTANT') RETURNING user_id`,
    ['Eve Russo', 'eve@fdm.com', hash]
  )
  const { rows: [frank] } = await client.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1,$2,$3,'CONSULTANT') RETURNING user_id`,
    ['Frank Osei', 'frank@fdm.com', hash]
  )

  // -- Client assignments ---------------------------------------------------
  const { rows: [charlieAssign] } = await client.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate) VALUES ($1,$2,$3) RETURNING assignment_id`,
    [charlie.user_id, 'Barclays', 55.00]
  )
  const { rows: [dianaAssign] } = await client.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate) VALUES ($1,$2,$3) RETURNING assignment_id`,
    [diana.user_id, 'HSBC', 60.00]
  )
  const { rows: [eveAssign] } = await client.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate) VALUES ($1,$2,$3) RETURNING assignment_id`,
    [eve.user_id, 'Lloyds Bank', 52.50]
  )
  const { rows: [frankAssign] } = await client.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate) VALUES ($1,$2,$3) RETURNING assignment_id`,
    [frank.user_id, 'NatWest', 57.50]
  )

  // -- Manager → consultant links -------------------------------------------
  await client.query(
    `INSERT INTO line_manager_consultants (manager_id, consultant_id) VALUES ($1,$2),($1,$3)`,
    [alice.user_id, charlie.user_id, diana.user_id]
  )
  await client.query(
    `INSERT INTO line_manager_consultants (manager_id, consultant_id) VALUES ($1,$2),($1,$3)`,
    [bob.user_id, eve.user_id, frank.user_id]
  )

  // -- Charlie's timesheets (Barclays) --------------------------------------
  // 3 weeks ago — COMPLETED (paid)
  const { rows: [c3] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'COMPLETED') RETURNING timesheet_id`,
    [charlie.user_id, charlieAssign.assignment_id, monday(3)]
  )
  await insertEntries(client, c3.timesheet_id, weekEntries(monday(3), [8, 8, 7.5, 8, 8]))
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

  // 2 weeks ago — APPROVED
  const { rows: [c2] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'APPROVED') RETURNING timesheet_id`,
    [charlie.user_id, charlieAssign.assignment_id, monday(2)]
  )
  await insertEntries(client, c2.timesheet_id, weekEntries(monday(2), [8, 8, 8, 8, 7]))
  await client.query(
    `INSERT INTO reviews (timesheet_id, reviewer_id, decision) VALUES ($1,$2,'APPROVED')`,
    [c2.timesheet_id, alice.user_id]
  )
  await logAudit(client, 'SUBMISSION', charlie.user_id, c2.timesheet_id, { previousStatus: 'DRAFT' })
  await logAudit(client, 'APPROVAL', alice.user_id, c2.timesheet_id, { decision: 'APPROVED' })

  // Last week — PENDING
  const { rows: [c1] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'PENDING') RETURNING timesheet_id`,
    [charlie.user_id, charlieAssign.assignment_id, monday(1)]
  )
  await insertEntries(client, c1.timesheet_id, weekEntries(monday(1), [8, 8, 8, 8, 8]))
  await logAudit(client, 'SUBMISSION', charlie.user_id, c1.timesheet_id, { previousStatus: 'DRAFT' })

  // This week — DRAFT
  const { rows: [c0] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'DRAFT') RETURNING timesheet_id`,
    [charlie.user_id, charlieAssign.assignment_id, monday(0)]
  )
  await insertEntries(client, c0.timesheet_id, weekEntries(monday(0), [8, 7.5, 0, 0, 0]))

  // -- Diana's timesheets (HSBC) --------------------------------------------
  // Last week — APPROVED
  const { rows: [d1] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'APPROVED') RETURNING timesheet_id`,
    [diana.user_id, dianaAssign.assignment_id, monday(1)]
  )
  await insertEntries(client, d1.timesheet_id, weekEntries(monday(1), [8, 8, 8, 8, 8]))
  await client.query(
    `INSERT INTO reviews (timesheet_id, reviewer_id, decision) VALUES ($1,$2,'APPROVED')`,
    [d1.timesheet_id, alice.user_id]
  )
  await logAudit(client, 'SUBMISSION', diana.user_id, d1.timesheet_id, { previousStatus: 'DRAFT' })
  await logAudit(client, 'APPROVAL', alice.user_id, d1.timesheet_id, { decision: 'APPROVED' })

  // This week — DRAFT
  const { rows: [d0] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'DRAFT') RETURNING timesheet_id`,
    [diana.user_id, dianaAssign.assignment_id, monday(0)]
  )
  await insertEntries(client, d0.timesheet_id, weekEntries(monday(0), [8, 8, 8, 0, 0]))

  // -- Eve's timesheets (Lloyds) --------------------------------------------
  // Last week — REJECTED
  const { rows: [e1] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'REJECTED') RETURNING timesheet_id`,
    [eve.user_id, eveAssign.assignment_id, monday(1)]
  )
  await insertEntries(client, e1.timesheet_id, weekEntries(monday(1), [8, 8, 0, 8, 8]))
  await client.query(
    `INSERT INTO reviews (timesheet_id, reviewer_id, decision, comment) VALUES ($1,$2,'REJECTED',$3)`,
    [e1.timesheet_id, bob.user_id, 'Wednesday hours missing — please correct and resubmit.']
  )
  await logAudit(client, 'SUBMISSION', eve.user_id, e1.timesheet_id, { previousStatus: 'DRAFT' })
  await logAudit(client, 'REJECTION', bob.user_id, e1.timesheet_id, {
    decision: 'REJECTED',
    comment: 'Wednesday hours missing — please correct and resubmit.',
  })

  // This week — DRAFT
  const { rows: [e0] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'DRAFT') RETURNING timesheet_id`,
    [eve.user_id, eveAssign.assignment_id, monday(0)]
  )
  await insertEntries(client, e0.timesheet_id, weekEntries(monday(0), [8, 8, 8, 7.5, 0]))

  // -- Frank's timesheets (NatWest) -----------------------------------------
  // This week — PENDING
  const { rows: [f0] } = await client.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start, status)
     VALUES ($1,$2,$3,'PENDING') RETURNING timesheet_id`,
    [frank.user_id, frankAssign.assignment_id, monday(0)]
  )
  await insertEntries(client, f0.timesheet_id, weekEntries(monday(0), [8, 8, 8, 8, 8]))
  await logAudit(client, 'SUBMISSION', frank.user_id, f0.timesheet_id, { previousStatus: 'DRAFT' })

  // -- Financial notes ------------------------------------------------------
  await client.query(
    `INSERT INTO financial_notes (timesheet_id, authored_by, note) VALUES ($1,$2,$3)`,
    [c3.timesheet_id, finance.user_id, 'Overtime rate applied for week ending 2026-03-06.']
  )

  await client.query('COMMIT')

  console.log('\n✅  Seed complete\n')
  console.log('All accounts use password:', DEFAULT_PASSWORD)
  console.log('')
  console.log('Role            Name              Email')
  console.log('--------------  ----------------  -----------------')
  console.log('SYSTEM_ADMIN    Admin User        admin@fdm.com')
  console.log('FINANCE_MANAGER Finance Manager   finance@fdm.com')
  console.log('LINE_MANAGER    Alice Hartley     alice@fdm.com')
  console.log('LINE_MANAGER    Bob Chen          bob@fdm.com')
  console.log('CONSULTANT      Charlie Okafor    charlie@fdm.com')
  console.log('CONSULTANT      Diana Patel       diana@fdm.com')
  console.log('CONSULTANT      Eve Russo         eve@fdm.com')
  console.log('CONSULTANT      Frank Osei        frank@fdm.com')
  console.log('')
  console.log('Timesheet state summary:')
  console.log('  Charlie  →  COMPLETED, APPROVED, PENDING, DRAFT')
  console.log('  Diana    →  APPROVED, DRAFT')
  console.log('  Eve      →  REJECTED, DRAFT')
  console.log('  Frank    →  PENDING')
} catch (err) {
  await client.query('ROLLBACK')
  console.error('Seed failed:', err.message)
  process.exit(1)
} finally {
  client.release()
  await pool.end()
}
