import pool from '../db.js'

export async function getAuditLog() {
  const { rows } = await pool.query(
    `SELECT a.audit_id, a.action, a.performed_by, a.timesheet_id, a.detail, a.created_at,
            u.name AS performed_by_name
     FROM audit_reports a
     LEFT JOIN users u ON u.user_id = a.performed_by
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
