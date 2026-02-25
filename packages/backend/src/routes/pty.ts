/**
 * PTY CRUD routes + WebSocket terminal I/O.
 * Text frames for terminal data, binary frames for control messages.
 */
import { Hono } from 'hono'
import * as PtyManager from '../pty-manager'

export function ptyRoutes(upgradeWebSocket: any) {
  const app = new Hono()

  // GET /pty — List all PTY sessions
  app.get('/', (c) => {
    return c.json(PtyManager.list())
  })

  // POST /pty — Create PTY session
  app.post('/', async (c) => {
    const body = await c.req.json<{
      cwd?: string
      shell?: string
      shellArgs?: string[]
      env?: Record<string, string>
      cols: number
      rows: number
    }>()

    try {
      const session = PtyManager.create({
        cwd: body.cwd,
        shell: body.shell,
        shellArgs: body.shellArgs,
        env: body.env,
        cols: body.cols || 80,
        rows: body.rows || 24,
      })

      return c.json({
        name: session.name,
        cwd: session.cwd,
      }, 201)
    } catch (err: any) {
      console.error('[pty.create] error:', err)
      return c.json({ error: err.message || 'Failed to create PTY session' }, 500)
    }
  })

  // GET /pty/:name — Get PTY session info
  app.get('/:name', (c) => {
    const name = c.req.param('name')
    const session = PtyManager.get(name)
    if (!session) {
      return c.json({ error: 'session not found' }, 404)
    }
    return c.json({
      name: session.name,
      cwd: session.cwd,
      title: session.title,
      command: session.currentCommand,
      cols: session.cols,
      rows: session.rows,
    })
  })

  // WS /pty/:name/ws — WebSocket terminal I/O
  app.get(
    '/:name/ws',
    upgradeWebSocket((c: any) => {
      const name = c.req.param('name')
      const cursorParam = c.req.query('cursor')
      const colsParam = c.req.query('cols')
      const rowsParam = c.req.query('rows')
      const cursor = cursorParam ? parseInt(cursorParam, 10) : 0
      const cols = colsParam ? parseInt(colsParam, 10) : 80
      const rows = rowsParam ? parseInt(rowsParam, 10) : 24

      return {
        onOpen(_evt: any, ws: any) {
          const rawWs = ws.raw as WebSocket
          const session = PtyManager.connect(name, rawWs, cursor, cols, rows)
          if (!session) {
            ws.close(1008, 'session not found')
          }
        },
        onMessage(evt: any, _ws: any) {
          const { data } = evt
          if (Buffer.isBuffer(data) || data instanceof ArrayBuffer || data instanceof Uint8Array) {
            const bytes = Buffer.isBuffer(data) ? data : new Uint8Array(data)
            if (bytes[0] === 0x01) {
              try {
                const ctrl = JSON.parse(new TextDecoder().decode(bytes.slice(1)))
                if (ctrl.cols && ctrl.rows) {
                  PtyManager.resize(name, ctrl.cols, ctrl.rows)
                }
              } catch (e) {
                console.error(`[pty-ws] resize parse error for ${name}:`, e)
              }
            }
            return
          }
          if (typeof data === 'string') {
            PtyManager.write(name, data)
          }
        },
        onClose(_evt: any, ws: any) {
          PtyManager.disconnect(name, ws.raw as WebSocket)
        },
        onError(_evt: any, ws: any) {
          PtyManager.disconnect(name, ws.raw as WebSocket)
        },
      }
    }),
  )

  // POST /pty/:name/resize — Resize terminal
  app.post('/:name/resize', async (c) => {
    const name = c.req.param('name')
    const body = await c.req.json<{ cols: number; rows: number }>()
    PtyManager.resize(name, body.cols, body.rows)
    return c.json({ ok: true })
  })

  // DELETE /pty/:name — Kill PTY session
  app.delete('/:name', (c) => {
    const name = c.req.param('name')
    PtyManager.kill(name)
    return c.json({ ok: true })
  })

  return app
}
