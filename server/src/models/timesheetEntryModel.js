import pool from '../db.js'

function httpError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

export async function getEntriesByTimesheet(timesheetId) {
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
     WHERE te.timesheet_id = $1
       AND te.entry_date BETWEEN t.week_start AND t.week_start + 6
     ORDER BY te.entry_date, bucket_label`,
    [timesheetId]
  )
  return rows
}

export async function getWorkSummariesByTimesheetIds(timesheetIds) {
  if (!Array.isArray(timesheetIds) || timesheetIds.length === 0) return []

  const { rows } = await pool.query(
    `SELECT te.timesheet_id,
            te.entry_kind,
            te.assignment_id,
            CASE
              WHEN te.entry_kind = 'INTERNAL' THEN 'Internal'
              ELSE COALESCE(ca.client_name, 'Unknown client assignment')
            END AS bucket_label,
            SUM(te.hours_worked) AS total_hours
     FROM timesheet_entries te
     LEFT JOIN client_assignments ca ON ca.assignment_id = te.assignment_id
     WHERE te.timesheet_id = ANY($1::uuid[])
     GROUP BY te.timesheet_id, te.entry_kind, te.assignment_id, bucket_label
     ORDER BY te.timesheet_id, bucket_label`,
    [timesheetIds]
  )
  return rows
}

export async function upsertEntries(timesheetId, entries) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: timesheetRows } = await client.query(
      `SELECT status
       FROM timesheets
       WHERE timesheet_id = $1
       FOR UPDATE`,
      [timesheetId]
    )

    if (timesheetRows.length === 0) {
      throw httpError('Timesheet not found', 404)
    }

    if (timesheetRows[0].status !== 'DRAFT' && timesheetRows[0].status !== 'REJECTED') {
      throw httpError('Only draft or rejected timesheets can be edited', 409)
    }

    await client.query(
      'DELETE FROM timesheet_entries WHERE timesheet_id = $1',
      [timesheetId]
    )

    for (const { date, entryKind, assignmentId, hoursWorked } of entries) {
      await client.query(
        `INSERT INTO timesheet_entries (timesheet_id, entry_date, entry_kind, assignment_id, hours_worked)
         VALUES ($1, $2, $3, $4, $5)`,
        [timesheetId, date, entryKind, assignmentId ?? null, hoursWorked]
      )
    }
    await client.query('COMMIT')
    const { rows } = await client.query(
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
       WHERE te.timesheet_id = $1
         AND te.entry_date BETWEEN t.week_start AND t.week_start + 6
       ORDER BY te.entry_date, bucket_label`,
      [timesheetId]
    )
    return rows
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
