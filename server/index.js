import express          from 'express'
import http             from 'http'
import { Server }       from 'socket.io'
import path             from 'path'
import { fileURLToPath } from 'url'
import ip               from 'ip'
import GameServer       from './GameServer.js'
import { EVENTS }       from '../shared/protocol.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app    = express()
const server = http.createServer(app)

const isDev = process.env.NODE_ENV !== 'production'
const PORT  = process.env.PORT || 3100

const io = new Server(server, {
  cors: isDev
    ? { origin: 'http://localhost:5173', methods: ['GET', 'POST'] }
    : false
})

// In production serve the Vite-built client
if (!isDev) {
  const distDir = path.join(__dirname, '../dist')
  app.use(express.static(distDir))
  app.get('/',           (_, res) => res.sendFile(path.join(distDir, 'index.html')))
  app.get('/controller', (_, res) => res.sendFile(path.join(distDir, 'controller.html')))
}

// Expose the LAN controller URL so the host page can generate the correct QR code
app.get('/api/network-url', (_, res) => {
  const clientPort = isDev ? 5173 : PORT
  const host = process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://${ip.address()}:${clientPort}`
  res.json({ url: `${host}/controller` })
})

const gameServer = new GameServer(io)

io.on('connection', socket => gameServer.handleConnection(socket))

server.listen(PORT, () => {
  const networkIP = ip.address()
  console.log('\n=================================')
  console.log('  RAID NIGHT - THE RESCUE  v2.0')
  console.log('=================================')
  console.log(`  Local:      http://localhost:${PORT}`)
  console.log(`  Network:    http://${networkIP}:${PORT}`)
  console.log(`  Host page:  /`)
  console.log(`  Controller: /controller`)
  if (isDev) console.log(`  Vite dev:   http://localhost:5173`)
  console.log('=================================\n')
})
