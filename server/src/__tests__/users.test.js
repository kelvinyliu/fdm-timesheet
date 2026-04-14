import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'

process.env.JWT_SECRET = 'test-secret'
process.env.LOG_LEVEL = 'silent'

vi.mock('../models/userModel.js', () => ({
  getAllUsers: vi.fn(),
  createUser: vi.fn(),
  updateUserRole: vi.fn(),
  deleteUser: vi.fn(),
  getConsultantPayRates: vi.fn(),
  findUserById: vi.fn(),
  updateUserDefaultPayRate: vi.fn(),
}))

import app from '../app.js'
import * as userModel from '../models/userModel.js'

const SECRET = 'test-secret'

function token(payload) {
  return `Bearer ${jwt.sign(payload, SECRET)}`
}

const financeToken = token({ userId: 'finance-1', role: 'FINANCE_MANAGER' })
const adminToken = token({ userId: 'admin-1', role: 'SYSTEM_ADMIN' })
const ADMIN_UUID = '11111111-1111-4111-8111-111111111111'
const uuidAdminToken = token({ userId: ADMIN_UUID, role: 'SYSTEM_ADMIN' })

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/users/submitters/pay-rates', () => {
  it('allows finance managers to list submitter pay rates', async () => {
    userModel.getConsultantPayRates.mockResolvedValue([
      {
        user_id: '11111111-1111-4111-8111-111111111111',
        name: 'Alex Consultant',
        email: 'alex@example.com',
        role: 'CONSULTANT',
        default_pay_rate: '35.00',
        created_at: '2025-03-24T00:00:00Z',
      },
      {
        user_id: '22222222-2222-4222-8222-222222222222',
        name: 'Lina Manager',
        email: 'lina@example.com',
        role: 'LINE_MANAGER',
        default_pay_rate: '45.00',
        created_at: '2025-03-24T00:00:00Z',
      },
    ])

    const res = await request(app)
      .get('/api/users/submitters/pay-rates')
      .set('Authorization', financeToken)

    expect(res.status).toBe(200)
    expect(res.body).toEqual([
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Alex Consultant',
        email: 'alex@example.com',
        role: 'CONSULTANT',
        defaultPayRate: 35,
        createdAt: '2025-03-24T00:00:00Z',
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Lina Manager',
        email: 'lina@example.com',
        role: 'LINE_MANAGER',
        defaultPayRate: 45,
        createdAt: '2025-03-24T00:00:00Z',
      },
    ])
  })

  it('still supports the legacy consultant pay-rates route', async () => {
    userModel.getConsultantPayRates.mockResolvedValue([])

    const res = await request(app)
      .get('/api/users/consultants/pay-rates')
      .set('Authorization', adminToken)

    expect(res.status).toBe(200)
  })
})

describe('PATCH /api/users/:id/default-pay-rate', () => {
  it('updates a consultant default pay rate', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'CONSULTANT',
    })
    userModel.updateUserDefaultPayRate.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      name: 'Alex Consultant',
      email: 'alex@example.com',
      role: 'CONSULTANT',
      default_pay_rate: '42.50',
      created_at: '2025-03-24T00:00:00Z',
    })

    const res = await request(app)
      .patch('/api/users/11111111-1111-4111-8111-111111111111/default-pay-rate')
      .set('Authorization', financeToken)
      .send({ defaultPayRate: 42.5 })

    expect(res.status).toBe(200)
    expect(userModel.updateUserDefaultPayRate).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      42.5
    )
    expect(res.body.defaultPayRate).toBe(42.5)
  })

  it('updates a line manager default pay rate', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'LINE_MANAGER',
    })
    userModel.updateUserDefaultPayRate.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      name: 'Lina Manager',
      email: 'lina@example.com',
      role: 'LINE_MANAGER',
      default_pay_rate: '42.50',
      created_at: '2025-03-24T00:00:00Z',
    })

    const res = await request(app)
      .patch('/api/users/11111111-1111-4111-8111-111111111111/default-pay-rate')
      .set('Authorization', financeToken)
      .send({ defaultPayRate: 42.5 })

    expect(res.status).toBe(200)
    expect(res.body.role).toBe('LINE_MANAGER')
    expect(res.body.defaultPayRate).toBe(42.5)
  })

  it('returns 400 for users who cannot submit timesheets', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'SYSTEM_ADMIN',
    })

    const res = await request(app)
      .patch('/api/users/11111111-1111-4111-8111-111111111111/default-pay-rate')
      .set('Authorization', financeToken)
      .send({ defaultPayRate: 42.5 })

    expect(res.status).toBe(400)
    expect(userModel.updateUserDefaultPayRate).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/users/:id/role', () => {
  it('rejects changing your own role with a mixed-case UUID', async () => {
    const res = await request(app)
      .patch(`/api/users/${ADMIN_UUID.toUpperCase()}/role`)
      .set('Authorization', uuidAdminToken)
      .send({ role: 'CONSULTANT' })

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/own role/i)
    expect(userModel.updateUserRole).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/users/:id', () => {
  it('rejects deleting your own account with a mixed-case UUID', async () => {
    const res = await request(app)
      .delete(`/api/users/${ADMIN_UUID.toUpperCase()}`)
      .set('Authorization', uuidAdminToken)

    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/own account/i)
    expect(userModel.deleteUser).not.toHaveBeenCalled()
  })
})
