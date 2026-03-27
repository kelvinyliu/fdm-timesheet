import { getAuditLog } from '../models/auditModel.js'
import { auditDto } from '../dtos/auditDto.js'

export async function listAuditLog(req, res, next) {
  try {
    const rows = await getAuditLog()
    res.json(rows.map(auditDto))
  } catch (err) {
    next(err)
  }
}
