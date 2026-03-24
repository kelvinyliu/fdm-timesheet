import express from 'express'
import cors from 'cors'
import errorHandler from './middleware/errorHandler.js'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import assignmentRoutes from './routes/assignments.js'
import managerAssignmentRoutes from './routes/managerAssignments.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/manager-assignments', managerAssignmentRoutes)

app.use(errorHandler)

export default app
