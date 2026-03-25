import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import logger from './logger.js'
import errorHandler from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import assignmentRoutes from './routes/assignments.js'
import managerAssignmentRoutes from './routes/managerAssignments.js'
import timesheetRoutes from './routes/timesheets.js'

const app = express()

app.use(pinoHttp({ logger }))
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
}))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/manager-assignments', managerAssignmentRoutes)
app.use('/api/timesheets', timesheetRoutes)

app.use(errorHandler)

export default app
