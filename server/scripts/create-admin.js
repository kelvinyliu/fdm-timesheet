#!/usr/bin/env node
// Usage: node scripts/create-admin.js <name> <email> <password>

import bcrypt from 'bcrypt'
import pg from 'pg'
import 'dotenv/config'

const [,, name, email, password] = process.argv

if (!name || !email || !password) {
  console.error('Usage: node scripts/create-admin.js <name> <email> <password>')
  process.exit(1)
}

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

const passwordHash = await bcrypt.hash(password, 10)

const { rows } = await pool.query(
  `INSERT INTO users (name, email, password_hash, role)
   VALUES ($1, $2, $3, 'SYSTEM_ADMIN')
   RETURNING user_id, name, email, role`,
  [name, email, passwordHash]
)

console.log('Admin user created:', rows[0])
await pool.end()
