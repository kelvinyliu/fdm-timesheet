import bcrypt from 'bcrypt'
import {
  getAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
  getConsultantPayRates,
  findUserById,
  updateUserDefaultPayRate,
} from '../models/userModel.js'
import { Role, TIMESHEET_SUBMITTER_ROLES } from '../constants/roles.js'
import { SALT_ROUNDS } from '../constants/security.js'
import { userDto } from '../dtos/userDto.js'
import { isUuid, sameUuid } from '../utils/validation.js'

const VALID_ROLES = Object.values(Role)

export async function listUsers(req, res, next) {
  try {
    const users = await getAllUsers()
    res.json(users.map(userDto))
  } catch (err) {
    next(err)
  }
}

export async function listConsultantPayRatesHandler(req, res, next) {
  try {
    const users = await getConsultantPayRates()
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

    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' })
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

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'id must be a valid UUID' })
    }

    if (!role || !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` })
    }

    if (sameUuid(id, req.user.userId)) {
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

export async function updateDefaultPayRateHandler(req, res, next) {
  try {
    const { id } = req.params
    const { defaultPayRate } = req.body

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'id must be a valid UUID' })
    }

    if (defaultPayRate === undefined || defaultPayRate === null || defaultPayRate === '') {
      return res.status(400).json({ error: 'defaultPayRate is required' })
    }

    const parsedDefaultPayRate = Number(defaultPayRate)
    if (!Number.isFinite(parsedDefaultPayRate) || parsedDefaultPayRate <= 0) {
      return res.status(400).json({ error: 'defaultPayRate must be greater than 0' })
    }

    const existingUser = await findUserById(id)
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (!TIMESHEET_SUBMITTER_ROLES.has(existingUser.role)) {
      return res.status(400).json({ error: 'defaultPayRate can only be set for CONSULTANT or LINE_MANAGER users' })
    }

    const user = await updateUserDefaultPayRate(id, parsedDefaultPayRate)
    res.json(userDto(user))
  } catch (err) {
    next(err)
  }
}

export async function deleteUserHandler(req, res, next) {
  try {
    const { id } = req.params

    if (!isUuid(id)) {
      return res.status(400).json({ error: 'id must be a valid UUID' })
    }

    if (sameUuid(id, req.user.userId)) {
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
