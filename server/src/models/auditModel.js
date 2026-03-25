import pool from '../db.js'

export async function logAction({ action, performedBy, timesheetId, detail }) {
  const { rows } = await pool.query(
    `INSERT INTO audit_reports (action, performed_by, timesheet_id, detail)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [action, performedBy, timesheetId, detail]
  )
  return rows[0]
}
