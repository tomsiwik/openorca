/**
 * Hono app setup with route registration and middleware.
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createNodeWebSocket } from '@hono/node-ws'
import { ptyRoutes } from './routes/pty'

export function createApp(token: string) {
  const app = new Hono()
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })

  // Middleware
  app.use('*', cors({
    origin: '*',
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  }))

  // Auth middleware: Bearer token, query param, or WebSocket subprotocol
  app.use('*', async (c, next) => {
    const path = c.req.path

    // Health check is public
    if (path === '/health') return next()

    // Check Authorization header
    const authHeader = c.req.header('Authorization')
    if (authHeader) {
      const parts = authHeader.split(' ')
      if (parts.length === 2 && parts[0] === 'Bearer' && parts[1] === token) {
        return next()
      }
    }

    // Check query param (for WebSocket fallback)
    const queryToken = c.req.query('token')
    if (queryToken === token) {
      return next()
    }

    // Check WebSocket subprotocol
    const wsProtocol = c.req.header('Sec-WebSocket-Protocol')
    if (wsProtocol) {
      const protocols = wsProtocol.split(',').map(p => p.trim())
      if (protocols.includes(token)) {
        return next()
      }
    }

    return c.json({ error: 'Unauthorized' }, 401)
  })

  // Health check (no auth)
  app.get('/health', (c) => c.json({ ok: true }))

  // Routes
  app.route('/pty', ptyRoutes(upgradeWebSocket))

  return { app, injectWebSocket }
}
