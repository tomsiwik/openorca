/**
 * Backend PTY server management.
 *
 * Dev mode:  Connect to the backend via portless (orca-backend.localhost:1355).
 * Production: Spawn the compiled backend as a child process.
 */
import { fork, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { app } from 'electron'

let serverProcess: ChildProcess | null = null
let serverUrl = ''
let serverToken = ''

const DEV_URL = 'http://orca.localhost:3000'

const DEV_TOKEN = 'dev'

function generateToken(): string {
  return randomBytes(32).toString('hex')
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, () => {
      const addr = srv.address()
      if (addr && typeof addr === 'object') {
        const port = addr.port
        srv.close(() => resolve(port))
      } else {
        reject(new Error('Failed to get port'))
      }
    })
    srv.on('error', reject)
  })
}

async function healthCheckUrl(url: string, retries = 30): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${url}/health`)
      if (res.ok) return true
    } catch {}
    await new Promise(r => setTimeout(r, 200))
  }
  return false
}

export async function startServer(): Promise<{ url: string; token: string }> {
  const isDev = process.env.NODE_ENV === 'development'

  // Dev mode — turbo runs @openorca/backend via portless (orca-backend.localhost:1355).
  // Set info immediately so the renderer can connect while we verify health.
  if (isDev) {
    serverUrl = DEV_URL
    serverToken = DEV_TOKEN
    healthCheckUrl(DEV_URL, 50).then((healthy) => {
      if (!healthy) {
        console.error('[server] Dev backend not reachable at', DEV_URL, '— is turbo running @openorca/backend?')
      }
    })
    return { url: DEV_URL, token: DEV_TOKEN }
  }

  // Production — spawn the compiled backend
  if (serverProcess) {
    return { url: serverUrl, token: serverToken }
  }

  const port = await findFreePort()
  const token = generateToken()
  const appRoot = app.isPackaged
    ? resolve(app.getAppPath(), '..')
    : app.getAppPath()
  const backendEntry = resolve(appRoot, 'backend/dist/index.js')

  serverProcess = fork(backendEntry, ['--port', String(port), '--token', token], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
  })

  serverProcess.stdout?.on('data', (data: Buffer) => {
    process.stderr.write(data)
  })
  serverProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(data)
  })

  serverProcess.on('exit', (code) => {
    console.error(`[server] Backend exited with code ${code}`)
    serverProcess = null
  })

  const url = `http://localhost:${port}`
  const healthy = await healthCheckUrl(url)
  if (!healthy) {
    throw new Error('Backend server failed to start')
  }

  serverUrl = url
  serverToken = token
  return { url, token }
}

export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
}

export function getServerInfo(): { url: string; token: string } | null {
  if (!serverUrl) return null
  return { url: serverUrl, token: serverToken }
}
