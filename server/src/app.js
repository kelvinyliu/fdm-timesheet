import express from 'express'
import cors from 'cors'
import errorHandler from './middleware/errorHandler.js'
import userRoutes from './routes/users.js'

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/users', userRoutes)

app.use(errorHandler)

export default app
