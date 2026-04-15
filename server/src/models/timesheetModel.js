import pool from '../db.js'

function httpError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

const TIMESHEET_SELECT = `
  SELECT t.timesheet_id, t.consultant_id, consultant.name AS consultant_name,
         t.assignment_id, assignment.client_name AS assignment_client_name,
         t.week_start, t.status, t.submitted_at, t.submitted_late,
         t.created_at, t.updated_at,
         p.total_bill_amount,
         p.total_pay_amount,
         p.margin_amount,
         lr.comment AS rejection_comment,
         lfr.comment AS finance_return_comment,
         lfr.created_at AS finance_returned_at,
         lfr.returned_by_name AS finance_returned_by_name,
         (SELECT COALESCE(SUM(te.hours_worked), 0)
          FROM timesheet_entries te
          WHERE te.timesheet_id = t.timesheet_id
            AND te.entry_date BETWEEN t.week_start AND t.week_start + 6) AS total_hours
  FROM timesheets t
  LEFT JOIN users consultant ON consultant.user_id = t.consultant_id
  LEFT JOIN client_assignments assignment ON assignment.assignment_id = t.assignment_id
  LEFT JOIN payments p ON p.timesheet_id = t.timesheet_id
  LEFT JOIN LATERAL (
    SELECT r.comment
    FROM reviews r
    WHERE r.timesheet_id = t.timesheet_id
    ORDER BY r.review_date DESC, r.review_id DESC
    LIMIT 1
  ) lr ON TRUE
  LEFT JOIN LATERAL (
    SELECT fr.comment, fr.created_at, u.name AS returned_by_name
    FROM finance_returns fr
    LEFT JOIN users u ON u.user_id = fr.returned_by
    WHERE fr.timesheet_id = t.timesheet_id
    ORDER BY fr.created_at DESC, fr.return_id DESC
    LIMIT 1
  ) lfr ON TRUE
`

async function getTimesheetByIdWithDb(db, id) {
  const { rows } = await db.query(
    `${TIMESHEET_SELECT}
     WHERE t.timesheet_id = $1`,
    [id]
  )
  return rows[0] ?? null
}

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
  return getTimesheetByIdWithDb(pool, id)
}

export async function createTimesheet({ consultantId, assignmentId, weekStart }) {
  const { rows } = await pool.query(
    `INSERT INTO timesheets (consultant_id, assignment_id, week_start)
     VALUES ($1, $2, $3)
     RETURNING timesheet_id`,
    [consultantId, assignmentId, weekStart]
  )
  return getTimesheetById(rows[0].timesheet_id)
}

export async function updateTimesheetStatus(id, status, options = {}) {
  const submittedAt = options.submittedAt ?? null
  const submittedLate = options.submittedLate ?? null
  const allowedStatuses = options.allowedStatuses ?? null
  const statusCondition = allowedStatuses
    ? 'AND status = ANY($5::timesheet_status[])'
    : ''
  const params = allowedStatuses
    ? [status, id, submittedAt, submittedLate, allowedStatuses]
    : [status, id, submittedAt, submittedLate]
  const { rows } = await pool.query(
    `UPDATE timesheets
     SET status = $1,
         submitted_at = COALESCE($3, submitted_at),
         submitted_late = COALESCE($4, submitted_late),
         updated_at = NOW()
     WHERE timesheet_id = $2
       ${statusCondition}
     RETURNING timesheet_id`,
    params
  )

  if (rows.length === 0) {
    if (allowedStatuses) {
      throw httpError(options.conflictMessage ?? 'Timesheet status has changed', 409)
    }
    return null
  }

  return getTimesheetById(rows[0].timesheet_id)
}

export async function reviewTimesheet(id, reviewerId, decision, comment) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE timesheets SET status = $1, updated_at = NOW()
       WHERE timesheet_id = $2 AND status IN ('PENDING', 'FINANCE_REJECTED')
       RETURNING *`,
      [decision, id]
    )

    if (rows.length === 0) {
      throw httpError('Only pending or finance-returned timesheets can be reviewed', 409)
    }

    await client.query(
      `INSERT INTO reviews (timesheet_id, reviewer_id, decision, comment)
       VALUES ($1, $2, $3, $4)`,
      [id, reviewerId, decision, comment ?? null]
    )

    const hydrated = await getTimesheetByIdWithDb(client, id)
    await client.query('COMMIT')
    return hydrated
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function returnTimesheetToManager(id, returnedBy, comment) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `UPDATE timesheets
       SET status = 'FINANCE_REJECTED',
           updated_at = NOW()
       WHERE timesheet_id = $1
         AND status = 'APPROVED'
       RETURNING *`,
      [id]
    )

    if (rows.length === 0) {
      throw httpError('Only approved timesheets can be returned to the line manager', 409)
    }

    await client.query(
      `INSERT INTO finance_returns (timesheet_id, returned_by, comment)
       VALUES ($1, $2, $3)`,
      [id, returnedBy, comment]
    )

    const hydrated = await getTimesheetByIdWithDb(client, id)
    await client.query('COMMIT')
    return hydrated
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getPreviousWeekEntries(consultantId, weekStart) {
  const { rows } = await pool.query(
    `SELECT te.entry_id,
            te.entry_date,
            te.entry_kind,
            te.assignment_id,
            te.hours_worked,
            CASE
              WHEN te.entry_kind = 'INTERNAL' THEN 'Internal'
              ELSE COALESCE(ca.client_name, 'Unknown client assignment')
            END AS bucket_label
     FROM timesheet_entries te
     JOIN timesheets t ON t.timesheet_id = te.timesheet_id
     LEFT JOIN client_assignments ca ON ca.assignment_id = te.assignment_id
     WHERE t.consultant_id = $1
       AND t.week_start = $2::date - INTERVAL '7 days'
       AND te.entry_date BETWEEN t.week_start AND t.week_start + 6
     ORDER BY te.entry_date, bucket_label`,
    [consultantId, weekStart]
  )
  return rows
}
