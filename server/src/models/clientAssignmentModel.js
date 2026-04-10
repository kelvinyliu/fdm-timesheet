import pool from '../db.js'

export async function getAssignmentsByConsultant(consultantId) {
  const { rows } = await pool.query(
    `SELECT assignment_id, consultant_id, client_name, client_bill_rate, created_at
     FROM client_assignments
     WHERE consultant_id = $1
       AND deleted_at IS NULL
     ORDER BY created_at DESC`,
    [consultantId]
  )
  return rows
}

export async function getAllAssignments() {
  const { rows } = await pool.query(
    `SELECT assignment_id, consultant_id, client_name, client_bill_rate, created_at
     FROM client_assignments
     WHERE deleted_at IS NULL
     ORDER BY created_at DESC`
  )
  return rows
}

export async function getAssignmentById(id) {
  const { rows } = await pool.query(
    `SELECT assignment_id, consultant_id, client_name, client_bill_rate, created_at
     FROM client_assignments
     WHERE assignment_id = $1
       AND deleted_at IS NULL`,
    [id]
  )
  return rows[0] ?? null
}

export async function getAssignmentByIdIncludingDeleted(id) {
  const { rows } = await pool.query(
    `SELECT assignment_id, consultant_id, client_name, client_bill_rate, created_at, deleted_at
     FROM client_assignments
     WHERE assignment_id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function createAssignment({ consultantId, clientName, clientBillRate }) {
  const { rows } = await pool.query(
    `INSERT INTO client_assignments (consultant_id, client_name, client_bill_rate)
     VALUES ($1, $2, $3)
     RETURNING assignment_id, consultant_id, client_name, client_bill_rate, created_at`,
    [consultantId, clientName, clientBillRate]
  )
  return rows[0]
}

export async function deleteAssignment(id) {
  const { rowCount } = await pool.query(
    `UPDATE client_assignments
     SET deleted_at = NOW()
     WHERE assignment_id = $1
       AND deleted_at IS NULL`,
    [id]
  )
  return rowCount > 0
}
