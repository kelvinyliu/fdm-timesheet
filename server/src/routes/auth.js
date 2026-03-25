import { Router } from 'express'
import { login, changePassword } from '../controllers/authController.js'
import auth from '../middleware/auth.js'

const router = Router()

router.post('/login', login)
router.post('/change-password', auth, changePassword)

export default router
