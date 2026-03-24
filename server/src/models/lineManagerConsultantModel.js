import pool from '../db.js'

export async function getAllManagerAssignments() {
  const { rows } = await pool.query(
    `SELECT lmc.id, lmc.assigned_at,
            m.user_id AS manager_id, m.name AS manager_name,
            c.user_id AS consultant_id, c.name AS consultant_name
     FROM line_manager_consultants lmc
     JOIN users m ON m.user_id = lmc.manager_id
     JOIN users c ON c.user_id = lmc.consultant_id
     ORDER BY lmc.assigned_at DESC`
  )
  return rows
}

export async function createManagerAssignment({ managerId, consultantId }) {
  const { rows } = await pool.query(
    `INSERT INTO line_manager_consultants (manager_id, consultant_id)
     VALUES ($1, $2)
     RETURNING id, manager_id, consultant_id, assigned_at`,
    [managerId, consultantId]
  )
  return rows[0]
}

export async function deleteManagerAssignment(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM line_manager_consultants WHERE id = $1',
    [id]
  )
  return rowCount > 0
}
