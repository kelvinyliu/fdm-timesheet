import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { findUserByEmail } from '../models/userModel.js'
import { userDto } from '../dtos/userDto.js'

export async function login(req, res, next) {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await findUserByEmail(email)

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY ?? '8h' }
    )

    res.json({ token, user: userDto(user) })
  } catch (err) {
    next(err)
  }
}
