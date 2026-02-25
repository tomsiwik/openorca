/**
 * Backend server entry point.
 * Parse --port and --token from argv, start Hono server with WebSocket support.
 */
import { serve } from '@hono/node-server'
import { createApp } from './app'
import * as PtyManager from './pty-manager'

function parseArgs(): { port: number; token: string } {
  const args = process.argv.slice(2)
  let port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000
  let token = ''

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10)
      i++
    } else if (args[i] === '--token' && args[i + 1]) {
      token = args[i + 1]
      i++
    }
  }

  if (!token) {
    token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  }

  return { port, token }
}

const { port, token } = parseArgs()
const { app, injectWebSocket } = createApp(token)

const server = serve({ fetch: app.fetch, port }, (info) => {
  const ts = new Date().toISOString()
  process.stderr.write(`[orca-server ${ts}] listening on http://localhost:${info.port}\n`)
  process.stderr.write(`[orca-server ${ts}] token: ${token}\n`)
})

injectWebSocket(server)

// Graceful shutdown
function shutdown() {
  PtyManager.killAll()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export default app
