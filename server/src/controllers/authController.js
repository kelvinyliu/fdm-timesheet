import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { findUserByEmail, findUserByIdWithHash, updateUserPassword } from '../models/userModel.js'
import { userDto } from '../dtos/userDto.js'
import { SALT_ROUNDS } from '../constants/security.js'

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

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' })
    }

    const user = await findUserByIdWithHash(req.user.userId)

    if (!user || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    await updateUserPassword(req.user.userId, passwordHash)

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
