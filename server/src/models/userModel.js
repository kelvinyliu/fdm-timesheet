import pool from '../db.js'

export async function findUserByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  )
  return rows[0] ?? null
}

export async function findUserById(id) {
  const { rows } = await pool.query(
    'SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1',
    [id]
  )
  return rows[0] ?? null
}

export async function getAllUsers() {
  const { rows } = await pool.query(
    'SELECT user_id, name, email, role, created_at FROM users ORDER BY created_at DESC'
  )
  return rows
}

export async function createUser({ name, email, passwordHash, role }) {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING user_id, name, email, role, created_at`,
    [name, email, passwordHash, role]
  )
  return rows[0]
}

export async function updateUserRole(id, role) {
  const { rows } = await pool.query(
    `UPDATE users SET role = $1 WHERE user_id = $2
     RETURNING user_id, name, email, role`,
    [role, id]
  )
  return rows[0] ?? null
}

export async function updateUserPassword(id, passwordHash) {
  await pool.query(
    'UPDATE users SET password_hash = $1 WHERE user_id = $2',
    [passwordHash, id]
  )
}

export async function deleteUser(id) {
  const { rowCount } = await pool.query(
    'DELETE FROM users WHERE user_id = $1',
    [id]
  )
  return rowCount > 0
}
