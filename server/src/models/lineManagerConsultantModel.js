import pool from '../db.js'

export async function getAllManagerAssignments() {
  const { rows } = await pool.query(
    `SELECT lmc.id, lmc.assigned_at,
            m.user_id AS manager_id, m.name AS manager_name, m.email AS manager_email,
            c.user_id AS consultant_id, c.name AS consultant_name
     FROM line_manager_consultants lmc
     JOIN users m ON m.user_id = lmc.manager_id
     JOIN users c ON c.user_id = lmc.consultant_id
     ORDER BY lmc.assigned_at DESC`
  )
  return rows
}

export async function getManagerAssignmentById(id) {
  const { rows } = await pool.query(
    `SELECT lmc.id, lmc.assigned_at,
            m.user_id AS manager_id, m.name AS manager_name, m.email AS manager_email,
            c.user_id AS consultant_id, c.name AS consultant_name
     FROM line_manager_consultants lmc
     JOIN users m ON m.user_id = lmc.manager_id
     JOIN users c ON c.user_id = lmc.consultant_id
     WHERE lmc.id = $1`,
    [id]
  )
  return rows[0] ?? null
}

export async function getManagerAssignmentByConsultantId(consultantId) {
  const { rows } = await pool.query(
    `SELECT lmc.id, lmc.assigned_at,
            m.user_id AS manager_id, m.name AS manager_name, m.email AS manager_email,
            c.user_id AS consultant_id, c.name AS consultant_name
     FROM line_manager_consultants lmc
     JOIN users m ON m.user_id = lmc.manager_id
     JOIN users c ON c.user_id = lmc.consultant_id
     WHERE lmc.consultant_id = $1`,
    [consultantId]
  )
  return rows[0] ?? null
}

export async function createManagerAssignment({ managerId, consultantId }) {
  const { rows } = await pool.query(
    `INSERT INTO line_manager_consultants (manager_id, consultant_id)
     VALUES ($1, $2)
     RETURNING id`,
    [managerId, consultantId]
  )
  return getManagerAssignmentById(rows[0].id)
}

export async function updateManagerAssignment(id, { managerId, consultantId }) {
  const { rows } = await pool.query(
    `UPDATE line_manager_consultants
     SET manager_id = $2,
         consultant_id = $3
     WHERE id = $1
     RETURNING id`,
    [id, managerId, consultantId]
  )

  if (rows.length === 0) {
    return null
  }

  return getManagerAssignmentById(rows[0].id)
}

export async function deleteManagerAssignment(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM line_manager_consultants WHERE id = $1',
    [id]
  )
  return rowCount > 0
}
