import pool from '../db.js'

export async function getEntriesByTimesheet(timesheetId) {
  const { rows } = await pool.query(
    `SELECT entry_id, entry_date, hours_worked
     FROM timesheet_entries
     WHERE timesheet_id = $1
     ORDER BY entry_date`,
    [timesheetId]
  )
  return rows
}

export async function upsertEntries(timesheetId, entries) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const { date, hoursWorked } of entries) {
      await client.query(
        `INSERT INTO timesheet_entries (timesheet_id, entry_date, hours_worked)
         VALUES ($1, $2, $3)
         ON CONFLICT (timesheet_id, entry_date) DO UPDATE SET hours_worked = EXCLUDED.hours_worked`,
        [timesheetId, date, hoursWorked]
      )
    }
    await client.query('COMMIT')
    const { rows } = await client.query(
      `SELECT entry_id, entry_date, hours_worked
       FROM timesheet_entries
       WHERE timesheet_id = $1
       ORDER BY entry_date`,
      [timesheetId]
    )
    return rows
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
