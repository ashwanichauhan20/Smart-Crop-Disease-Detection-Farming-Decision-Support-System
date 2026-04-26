const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const http = require('http')
const { ExpressPeerServer } = require('peer')
const dotenv = require('dotenv')
const dns = require('dns')
const mandiRoutes = require('./routes/mandiRoutes')
const weatherRoutes = require('./routes/weatherRoutes')
const authRoutes = require('./routes/authRoutes')
const userRoutes = require('./routes/userRoutes')
const communityRoutes = require('./routes/communityRoutes')
const schemeRoutes = require('./routes/schemeRoutes')
const adminRoutes = require('./routes/adminRoutes')
const messageRoutes = require('./routes/messageRoutes')
const appointmentRoutes = require('./routes/appointmentRoutes')
const priceUpdateJob = require('./jobs/priceUpdateJob')

// Set DNS servers to Google/Cloudflare to fix SRV lookup issues on some Windows networks
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4'])

dotenv.config()

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5001

// Setup PeerJS Signaling Server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/'
})
app.use('/api/peerjs', peerServer)

// ─── Middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'https://*.vercel.app'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ─── Health Check ────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  })
})

// ─── API Routes ──────────────────────────────────────────────────────────
app.use('/api/mandis', mandiRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/community', communityRoutes)
app.use('/api/schemes', schemeRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/appointments', appointmentRoutes)

const path = require('path')

// ─── Serve Frontend in Production ─────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')))
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'))
  })
}

// ─── 404 Handler ─────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// ─── Global Error Handler ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message)
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' })
})

// ─── Connect MongoDB & Start Server ──────────────────────────────────────
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      console.warn('⚠️  MONGO_URI not set in .env — database features will be unavailable.')
      console.warn('   Copy .env.example to .env and fill in your MongoDB connection string.')
    } else {
      await mongoose.connect(process.env.MONGO_URI)
      console.log('✅ MongoDB connected successfully')

      // Ensure default admin exists for messaging
      const User = require('./models/User')
      const adminExists = await User.findOne({ role: 'admin' })
      if (!adminExists) {
          await User.create({
              name: 'System Admin',
              email: 'fasal@admin.com',
              password: 'hashed_password_placeholder',
              role: 'admin',
              approved: true
          })
          console.log('✅ Created default Admin user')
      }

      // Start cron job for price updates (every 6 hours)
      priceUpdateJob.start()
      console.log('⏰ Price update cron job scheduled (every 6 hours)')
    }

    server.listen(PORT, () => {
      console.log(`🚀 API running at http://localhost:${PORT}`)
      console.log(`📡 PeerJS WebRTC Server running at http://localhost:${PORT}/api/peerjs`)
      console.log(`📋 Health check: http://localhost:${PORT}/health`)
    })
  } catch (err) {
    console.error('❌ Failed to start server:', err.message)
    process.exit(1)
  }
}

startServer()

module.exports = app
