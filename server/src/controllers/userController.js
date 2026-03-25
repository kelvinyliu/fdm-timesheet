import bcrypt from 'bcrypt'
import { getAllUsers, createUser, updateUserRole, deleteUser } from '../models/userModel.js'
import { Role } from '../constants/roles.js'
import { userDto } from '../dtos/userDto.js'

const VALID_ROLES = Object.values(Role)
const SALT_ROUNDS = 10

export async function listUsers(req, res, next) {
  try {
    const users = await getAllUsers()
    res.json(users.map(userDto))
  } catch (err) {
    next(err)
  }
}

export async function createUserHandler(req, res, next) {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' })
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` })
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await createUser({ name, email, passwordHash, role })

    res.status(201).json(userDto(user))
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use' })
    }
    next(err)
  }
}

export async function updateRoleHandler(req, res, next) {
  try {
    const { id } = req.params
    const { role } = req.body

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` })
    }

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' })
    }

    const user = await updateUserRole(id, role)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json(userDto(user))
  } catch (err) {
    next(err)
  }
}

export async function deleteUserHandler(req, res, next) {
  try {
    const { id } = req.params

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    const deleted = await deleteUser(id)

    if (!deleted) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
