import pool from '../db.js'

const TIMESHEET_SELECT = `
  SELECT t.timesheet_id, t.consultant_id, t.assignment_id, t.week_start, t.status,
         t.created_at, t.updated_at,
         lr.comment AS rejection_comment,
         (SELECT COALESCE(SUM(te.hours_worked), 0)
          FROM timesheet_entries te
          WHERE te.timesheet_id = t.timesheet_id) AS total_hours
  FROM timesheets t
  LEFT JOIN LATERAL (
    SELECT r.comment
    FROM reviews r
    WHERE r.timesheet_id = t.timesheet_id
    ORDER BY r.review_date DESC, r.review_id DESC
    LIMIT 1
  ) lr ON TRUE
`

export async function getTimesheetsByConsultant(consultantId) {
  const { rows } = await pool.query(
    `${TIMESHEET_SELECT}
     WHERE t.consultant_id = $1
     ORDER BY t.week_start DESC`,
    [consultantId]
  )
  return rows
}

export async function getTimesheetsForManager(managerId) {
  const { rows } = await pool.query(
    `${TIMESHEET_SELECT}
     JOIN line_manager_consultants lmc ON lmc.consultant_id = t.consultant_id
     WHERE lmc.manager_id = $1
     ORDER BY t.week_start DESC`,
    [managerId]
  )
  return rows
}

export async function getApprovedTimesheets() {
  const { rows } = await pool.query(
    `${TIMESHEET_SELECT}
     WHERE t.status IN ('APPROVED', 'COMPLETED')
     ORDER BY t.week_start DESC`
  )
  return rows
}

export async function getTimesheetById(id) {
  const { rows } = await pool.query(
    `${TIMESHEET_SELECT}
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
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE timesheets SET status = $1, updated_at = NOW()
       WHERE timesheet_id = $2 AND status = 'PENDING'
       RETURNING *`,
      [decision, id]
    )

    if (rows.length === 0) {
      const err = new Error('Only pending timesheets can be reviewed')
      err.status = 409
      throw err
    }

    await client.query(
      `INSERT INTO reviews (timesheet_id, reviewer_id, decision, comment)
       VALUES ($1, $2, $3, $4)`,
      [id, reviewerId, decision, comment ?? null]
    )

    await client.query('COMMIT')
    return { ...rows[0], rejection_comment: decision === 'REJECTED' ? comment : null }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
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
