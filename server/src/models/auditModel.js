import pool from '../db.js'

export async function getAuditLog() {
  const { rows } = await pool.query(
    `SELECT a.audit_id, a.action, a.performed_by, a.timesheet_id, a.detail, a.created_at,
            actor.name AS performed_by_name,
            ts.week_start AS timesheet_week_start,
            consultant.name AS timesheet_consultant_name
     FROM audit_reports a
     LEFT JOIN users actor ON actor.user_id = a.performed_by
     LEFT JOIN timesheets ts ON ts.timesheet_id = a.timesheet_id
     LEFT JOIN users consultant ON consultant.user_id = ts.consultant_id
     ORDER BY a.created_at DESC`
  )
  return rows
}

export async function logAction({ action, performedBy, timesheetId, detail }) {
  const { rows } = await pool.query(
    `INSERT INTO audit_reports (action, performed_by, timesheet_id, detail)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [action, performedBy, timesheetId, detail]
  )
  return rows[0]
}
