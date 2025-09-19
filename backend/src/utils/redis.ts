import { createClient } from 'redis'
import config from './config'
import logger from './logger'

// Create Redis client
export const redisClient = createClient({
  url: config.redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis connection failed after 10 retries')
        return new Error('Redis connection retry limit exceeded')
      }
      // Exponential backoff with max 3 seconds
      const delay = Math.min(retries * 50, 3000)
      logger.info(`Redis reconnecting... Attempt ${retries}, delay ${delay}ms`)
      return delay
    }
  }
})

// Error handling
redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err)
})

redisClient.on('connect', () => {
  logger.info('Redis Client Connected')
})

redisClient.on('ready', () => {
  logger.info('Redis Client Ready')
})

// Connect to Redis
export const connectRedis = async () => {
  try {
    await redisClient.connect()
    logger.info('Successfully connected to Redis')
  } catch (error) {
    logger.error('Failed to connect to Redis:', error)
    // Allow the app to run without Redis for development
    if (process.env.NODE_ENV === 'production') {
      throw error
    }
  }
}

// Graceful shutdown
export const disconnectRedis = async () => {
  try {
    await redisClient.quit()
    logger.info('Redis connection closed gracefully')
  } catch (error) {
    logger.error('Error closing Redis connection:', error)
  }
}

export default redisClient