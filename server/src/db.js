import pg from 'pg'

const { Pool, types } = pg

// Keep DATE columns as YYYY-MM-DD strings so calendar dates are never shifted by timezone/DST.
types.setTypeParser(types.builtins.DATE, (value) => value)

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

export default pool
