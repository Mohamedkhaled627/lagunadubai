import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer((req, res) => {
  // Health check endpoint - must return before socket.io handles it
  if (req.url?.includes('health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', calls: calls.length, cashiers: cashiers.size }))
    return
  }
  // For other requests, let socket.io handle them (don't send anything here)
})

const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
})

const PORT = 3003

interface WaiterCall {
  id: string
  tableName: string
  tableNumber: number
  message: string
  timestamp: number
  status: 'pending' | 'served'
}

const calls: WaiterCall[] = []
const cashiers = new Set<string>()

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`)

  socket.on('cashier:join', () => {
    socket.join('cashiers')
    cashiers.add(socket.id)
    console.log(`[CASHIER] ${socket.id} joined`)
    const pending = calls.filter((c) => c.status === 'pending')
    socket.emit('calls:init', pending)
  })

  socket.on('waiter:call', (data: { tableName: string; tableNumber: number; message?: string }) => {
    const call: WaiterCall = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tableName: data.tableName,
      tableNumber: data.tableNumber,
      message: data.message || `العميل في ${data.tableName} بيستدعيك`,
      timestamp: Date.now(),
      status: 'pending',
    }
    calls.unshift(call)
    if (calls.length > 50) calls.pop()
    console.log(`[CALL] ${call.tableName}: ${call.message}`)
    io.to('cashiers').emit('waiter:called', call)
  })

  socket.on('call:serve', (data: { callId: string }) => {
    const call = calls.find((c) => c.id === data.callId)
    if (call) {
      call.status = 'served'
      io.to('cashiers').emit('call:served', { callId: call.id })
    }
  })

  socket.on('disconnect', () => {
    cashiers.delete(socket.id)
  })
})

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Laguna waiter-notifications running on 0.0.0.0:${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing...')
  httpServer.close()
  process.exit(0)
})
process.on('SIGINT', () => {
  console.log('SIGINT received, closing...')
  httpServer.close()
  process.exit(0)
})
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
})
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
})
