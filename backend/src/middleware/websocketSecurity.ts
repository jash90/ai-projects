import { Server as SocketIOServer } from 'socket.io'
import logger from '../utils/logger'

/**
 * Enhanced WebSocket security configuration
 */
export function configureWebSocketSecurity(io: SocketIOServer) {
  // Rate limiting for WebSocket connections
  const connectionRates = new Map<string, { count: number; resetTime: number }>()

  io.use((socket, next) => {
    const clientIP = socket.request.connection.remoteAddress || 'unknown'
    const now = Date.now()

    // Clean up old entries
    for (const [ip, data] of connectionRates.entries()) {
      if (now > data.resetTime) {
        connectionRates.delete(ip)
      }
    }

    // Check rate limit (max 10 connections per minute per IP)
    const current = connectionRates.get(clientIP) || { count: 0, resetTime: now + 60000 }

    if (current.count >= 10) {
      logger.warn('WebSocket connection rate limit exceeded', { clientIP })
      return next(new Error('Connection rate limit exceeded'))
    }

    current.count++
    connectionRates.set(clientIP, current)

    next()
  })

  // Connection monitoring
  io.on('connection', (socket) => {
    const clientIP = socket.request.connection.remoteAddress
    logger.info('WebSocket connection established', {
      socketId: socket.id,
      clientIP,
      userAgent: socket.request.headers['user-agent']
    })

    // Limit maximum message size
    socket.use(([event, ...args], next) => {
      const messageSize = JSON.stringify(args).length

      if (messageSize > 100000) { // 100KB limit
        logger.warn('WebSocket message too large', {
          socketId: socket.id,
          clientIP,
          messageSize,
          event
        })
        return next(new Error('Message too large'))
      }

      next()
    })

    // Disconnect timeout for idle connections
    let activityTimeout = setTimeout(() => {
      logger.info('Disconnecting idle WebSocket connection', { socketId: socket.id })
      socket.disconnect(true)
    }, 300000) // 5 minutes

    // Reset timeout on activity
    socket.onAny(() => {
      clearTimeout(activityTimeout)
      activityTimeout = setTimeout(() => {
        socket.disconnect(true)
      }, 300000)
    })

    socket.on('disconnect', () => {
      clearTimeout(activityTimeout)
      logger.info('WebSocket connection closed', { socketId: socket.id, clientIP })
    })
  })

  return io
}