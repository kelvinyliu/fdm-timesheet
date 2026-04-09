export function userDto(row) {
  return {
    id: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    defaultPayRate: row.default_pay_rate == null ? null : parseFloat(row.default_pay_rate),
    createdAt: row.created_at,
  }
}
