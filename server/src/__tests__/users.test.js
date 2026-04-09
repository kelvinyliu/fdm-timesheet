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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/users/consultants/pay-rates', () => {
  it('allows finance managers to list consultant pay rates', async () => {
    userModel.getConsultantPayRates.mockResolvedValue([
      {
        user_id: '11111111-1111-4111-8111-111111111111',
        name: 'Alex Consultant',
        email: 'alex@example.com',
        role: 'CONSULTANT',
        default_pay_rate: '35.00',
        created_at: '2025-03-24T00:00:00Z',
      },
    ])

    const res = await request(app)
      .get('/api/users/consultants/pay-rates')
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
    ])
  })

  it('still allows system admins to list consultant pay rates', async () => {
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

  it('returns 400 for non-consultants', async () => {
    userModel.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      role: 'LINE_MANAGER',
    })

    const res = await request(app)
      .patch('/api/users/11111111-1111-4111-8111-111111111111/default-pay-rate')
      .set('Authorization', financeToken)
      .send({ defaultPayRate: 42.5 })

    expect(res.status).toBe(400)
    expect(userModel.updateUserDefaultPayRate).not.toHaveBeenCalled()
  })
})
