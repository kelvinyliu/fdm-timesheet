import pool from '../db.js'

async function getPaymentBreakdownsWithDb(db, paymentId) {
  const { rows } = await db.query(
    `SELECT entry_kind,
            assignment_id,
            bucket_label,
            hours_worked,
            hourly_rate,
            amount
     FROM payment_breakdowns
     WHERE payment_id = $1
     ORDER BY bucket_label`,
    [paymentId]
  )

  return rows.map((row) => ({
    entryKind: row.entry_kind,
    assignmentId: row.assignment_id ?? null,
    bucketLabel: row.bucket_label,
    hoursWorked: row.hours_worked,
    hourlyRate: row.hourly_rate,
    amount: row.amount,
  }))
}

export async function getPaymentByTimesheet(timesheetId) {
  const { rows } = await pool.query(
    'SELECT * FROM payments WHERE timesheet_id = $1',
    [timesheetId]
  )
  if (rows.length === 0) return null

  return {
    ...rows[0],
    breakdowns: await getPaymentBreakdownsWithDb(pool, rows[0].payment_id),
  }
}

export async function createPayment({ timesheetId, processedBy, amount, breakdowns }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO payments (timesheet_id, processed_by, daily_rate, amount, status)
       VALUES ($1, $2, $3, $4, 'COMPLETED')
       RETURNING *`,
      [timesheetId, processedBy, null, amount]
    )

    for (const breakdown of breakdowns) {
      await client.query(
        `INSERT INTO payment_breakdowns (
           payment_id, entry_kind, assignment_id, bucket_label, hours_worked, hourly_rate, amount
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          rows[0].payment_id,
          breakdown.entryKind,
          breakdown.assignmentId ?? null,
          breakdown.bucketLabel,
          breakdown.hoursWorked,
          breakdown.hourlyRate,
          breakdown.amount,
        ]
      )
    }

    await client.query(
      `UPDATE timesheets SET status = 'COMPLETED', updated_at = NOW()
       WHERE timesheet_id = $1`,
      [timesheetId]
    )
    await client.query('COMMIT')
    return {
      ...rows[0],
      breakdowns: await getPaymentBreakdownsWithDb(client, rows[0].payment_id),
    }
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
