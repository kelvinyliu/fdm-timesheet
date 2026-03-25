import pool from '../db.js'

export async function getTimesheetsByConsultant(consultantId) {
  const { rows } = await pool.query(
    `SELECT t.timesheet_id, t.consultant_id, t.assignment_id, t.week_start, t.status,
            t.created_at, t.updated_at, r.comment AS rejection_comment
     FROM timesheets t
     LEFT JOIN reviews r ON r.timesheet_id = t.timesheet_id
     WHERE t.consultant_id = $1
     ORDER BY t.week_start DESC`,
    [consultantId]
  )
  return rows
}

export async function getTimesheetsForManager(managerId) {
  const { rows } = await pool.query(
    `SELECT t.timesheet_id, t.consultant_id, t.assignment_id, t.week_start, t.status,
            t.created_at, t.updated_at, r.comment AS rejection_comment
     FROM timesheets t
     JOIN line_manager_consultants lmc ON lmc.consultant_id = t.consultant_id
     LEFT JOIN reviews r ON r.timesheet_id = t.timesheet_id
     WHERE lmc.manager_id = $1
     ORDER BY t.week_start DESC`,
    [managerId]
  )
  return rows
}

export async function getTimesheetById(id) {
  const { rows } = await pool.query(
    `SELECT t.timesheet_id, t.consultant_id, t.assignment_id, t.week_start, t.status,
            t.created_at, t.updated_at, r.comment AS rejection_comment
     FROM timesheets t
     LEFT JOIN reviews r ON r.timesheet_id = t.timesheet_id
     WHERE t.timesheet_id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function createTimesheet({ consultantId, assignmentId, weekStart }) {
  const { rows } = await pool.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [consultantId, assignmentId, weekStart]
  )
  return rows[0]
}

export async function updateTimesheetStatus(id, status) {
  const { rows } = await pool.query(
    `UPDATE timesheets SET status = $1, updated_at = NOW()
     WHERE timesheet_id = $2
     RETURNING *`,
    [status, id]
  )
  return rows[0] ?? null
}

export async function reviewTimesheet(id, reviewerId, decision, comment) {
  await pool.query(
    `INSERT INTO reviews (timesheet_id, reviewer_id, decision, comment)
     VALUES ($1, $2, $3, $4)`,
    [id, reviewerId, decision, comment ?? null]
  )
  const { rows } = await pool.query(
    `UPDATE timesheets SET status = $1, updated_at = NOW()
     WHERE timesheet_id = $2
     RETURNING *`,
    [decision, id]
  )
  return { ...rows[0], rejection_comment: decision === 'REJECTED' ? comment : null }
}

export async function getPreviousWeekEntries(consultantId, weekStart) {
  const { rows } = await pool.query(
    `SELECT te.entry_date, te.hours_worked
     FROM timesheet_entries te
     JOIN timesheets t ON t.timesheet_id = te.timesheet_id
     WHERE t.consultant_id = $1
       AND t.week_start = $2::date - INTERVAL '7 days'
     ORDER BY te.entry_date`,
    [consultantId, weekStart]
  )
  return rows
}
