import pool from '../db.js'

export async function getAssignmentsByConsultant(consultantId) {
  const { rows } = await pool.query(
    `SELECT assignment_id, client_name, hourly_rate, created_at
     FROM client_assignments
     WHERE consultant_id = $1
     ORDER BY created_at DESC`,
    [consultantId]
  )
  return rows
}

export async function getAllAssignments() {
  const { rows } = await pool.query(
    `SELECT assignment_id, consultant_id, client_name, hourly_rate, created_at
     FROM client_assignments
     ORDER BY created_at DESC`
  )
  return rows
}

export async function getAssignmentById(id) {
  const { rows } = await pool.query(
    `SELECT assignment_id, consultant_id, client_name, hourly_rate, created_at
     FROM client_assignments
     WHERE assignment_id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function createAssignment({ consultantId, clientName, hourlyRate }) {
  const { rows } = await pool.query(
    `INSERT INTO client_assignments (consultant_id, client_name, hourly_rate)
     VALUES ($1, $2, $3)
     RETURNING assignment_id, consultant_id, client_name, hourly_rate, created_at`,
    [consultantId, clientName, hourlyRate]
  )
  return rows[0]
}

export async function deleteAssignment(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM client_assignments WHERE assignment_id = $1',
    [id]
  )
  return rowCount > 0
}
