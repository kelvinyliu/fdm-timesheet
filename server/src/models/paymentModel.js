import pool from '../db.js'

export async function getPaymentByTimesheet(timesheetId) {
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE timesheet_id = $1',
    [timesheetId]
  )
  return rows[0] ?? null
}

export async function createPayment({ timesheetId, processedBy, hourlyRate, amount }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO payments (timesheet_id, processed_by, daily_rate, amount, status)
       VALUES ($1, $2, $3, $4, 'COMPLETED')
       RETURNING *`,
      [timesheetId, processedBy, hourlyRate, amount]
    )
    await client.query(
      `UPDATE timesheets SET status = 'COMPLETED', updated_at = NOW()
       WHERE timesheet_id = $1`,
      [timesheetId]
    )
    await client.query('COMMIT')
    return rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getFinancialNotes(timesheetId) {
  const { rows } = await pool.query(
    `SELECT fn.*, u.name AS authored_by_name
     FROM financial_notes fn
     LEFT JOIN users u ON fn.authored_by = u.user_id
     WHERE fn.timesheet_id = $1
     ORDER BY fn.created_at ASC`,
    [timesheetId]
  )
  return rows
}

export async function createFinancialNote({ timesheetId, authoredBy, note }) {
  const { rows } = await pool.query(
    `INSERT INTO financial_notes (timesheet_id, authored_by, note)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [timesheetId, authoredBy, note]
  )
  return rows[0]
}
