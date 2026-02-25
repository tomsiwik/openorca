/**
 * PTY session lifecycle manager.
 * Simplified from openelk — no zmx, no ghostty-vt server-side.
 * Direct node-pty only.
 */
import { execFileSync, execFile } from 'node:child_process'
import * as pty from 'node-pty'
import type { IPty } from 'node-pty'
import { OscParser } from './osc-parser'
import { bus } from './bus'

// ── Types ────────────────────────────────────────────────────────

export interface PtySession {
  name: string
  ptyProcess: IPty
  osc: OscParser
  buffer: string
  bufferStart: number
  cursor: number
  subscribers: Set<WebSocket>
  cwd?: string
  title?: string
  currentCommand?: string
  cols: number
  rows: number
}

export interface PtySessionInfo {
  name: string
  cwd?: string
  title?: string
  command?: string
  cols: number
  rows: number
}

interface CreateOptions {
  cwd?: string
  shell?: string
  shellArgs?: string[]
  env?: Record<string, string>
  cols: number
  rows: number
}

// ── Constants ────────────────────────────────────────────────────

const BUFFER_MAX = 2 * 1024 * 1024
const CHUNK_SIZE = 64 * 1024
// ── Globals ──────────────────────────────────────────────────────

const sessions = new Map<string, PtySession>()
let sessionCounter = 0

// ── Shell Environment ────────────────────────────────────────────

let cachedUserPath: string | null = null

function getUserPath(): string {
  if (cachedUserPath) return cachedUserPath
  const shell = process.env.SHELL || '/bin/zsh'
  try {
    cachedUserPath = execFileSync(shell, ['-l', '-c', 'echo $PATH'], {
      encoding: 'utf-8',
      timeout: 5000,
    }).trim()
  } catch {
    cachedUserPath = '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
  }
  return cachedUserPath
}

function buildShellEnv(extra?: Record<string, string>): Record<string, string> {
  const keep = [
    'HOME', 'USER', 'LOGNAME', 'SHELL', 'TERM',
    'LANG', 'LC_ALL', 'LC_CTYPE', 'LC_COLLATE', 'LC_MESSAGES',
    'COLORTERM', 'TERM_PROGRAM', 'DISPLAY',
    'SSH_AUTH_SOCK', 'TMPDIR', 'XDG_RUNTIME_DIR',
    'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME',
  ]

  const env: Record<string, string> = {}
  for (const key of keep) {
    if (process.env[key]) env[key] = process.env[key]!
  }

  env.PATH = getUserPath()
  env.SHLVL = '0'
  env.COLORTERM = 'truecolor'
  env.TERM = 'xterm-256color'
  env.TERM_PROGRAM = 'OpenOrca'
  env.TERM_PROGRAM_VERSION = '0.1.0'

  // Remove terminal-specific env vars that trigger escape sequences
  // ghostty-web doesn't understand (kitty keyboard protocol, OSC 16, graphics protocol)
  delete env.KITTY_WINDOW_ID
  delete env.KITTY_PID
  delete env.KITTY_PUBLIC_KEY
  delete env.KITTY_INSTALLATION_DIR

  if (extra) {
    Object.assign(env, extra)
  }

  return env
}

function generateSessionName(): string {
  return `orca-${Date.now()}-${++sessionCounter}`
}

// ── Logging ──────────────────────────────────────────────────────

function log(msg: string): void {
  const ts = new Date().toISOString()
  process.stderr.write(`[orca-server ${ts}] ${msg}\n`)
}

// ── Buffer Management ────────────────────────────────────────────

function appendToBuffer(session: PtySession, data: string): void {
  session.buffer += data
  session.cursor += data.length

  if (session.buffer.length > BUFFER_MAX) {
    const excess = session.buffer.length - BUFFER_MAX
    session.buffer = session.buffer.slice(excess)
    session.bufferStart += excess
  }
}

// ── Notification ─────────────────────────────────────────────────

function sendNotification(title: string, message: string): void {
  if (process.platform !== 'darwin') return
  const script = `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`
  execFile('osascript', ['-e', script], () => {})
}

// ── Public API ───────────────────────────────────────────────────

export function create(opts: CreateOptions): PtySession {
  const shell = opts.shell || process.env.SHELL || '/bin/zsh'
  const shellArgs = opts.shellArgs || ['--login']
  const env = buildShellEnv(opts.env)
  const spawnCwd = opts.cwd || process.env.HOME || '/'
  const name = generateSessionName()

  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-256color',
    cols: opts.cols,
    rows: opts.rows,
    cwd: spawnCwd,
    env,
  })

  const osc = new OscParser()

  const session: PtySession = {
    name,
    ptyProcess,
    osc,
    buffer: '',
    bufferStart: 0,
    cursor: 0,
    subscribers: new Set(),
    cwd: spawnCwd,
    cols: opts.cols,
    rows: opts.rows,
  }

  wireSession(session)
  sessions.set(name, session)

  log(`session ${name} created (cwd=${spawnCwd})`)
  bus.publish('pty.created', { name, cwd: spawnCwd })

  return session
}

export function get(name: string): PtySession | undefined {
  return sessions.get(name)
}

export function list(): PtySessionInfo[] {
  return Array.from(sessions.values()).map((s) => ({
    name: s.name,
    cwd: s.cwd,
    title: s.title,
    command: s.currentCommand,
    cols: s.cols,
    rows: s.rows,
  }))
}

/**
 * Connect a WebSocket to a PTY session.
 * Replays buffer from cursor position in chunks.
 */
export function connect(
  name: string,
  ws: WebSocket,
  cursor: number,
  cols: number,
  rows: number,
): PtySession | null {
  const session = sessions.get(name)
  if (!session) return null

  // Replay buffer from cursor position
  const bufferEnd = session.bufferStart + session.buffer.length
  const replayFrom = Math.max(cursor, session.bufferStart)

  if (replayFrom < bufferEnd) {
    const offset = replayFrom - session.bufferStart
    const data = session.buffer.slice(offset)

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE)
      try {
        ws.send(chunk)
      } catch {
        return null
      }
    }
  }

  // Send cursor control frame (binary: 0x00 + JSON)
  const cursorFrame = new TextEncoder().encode('\x00' + JSON.stringify({ cursor: session.cursor }))
  try {
    ws.send(cursorFrame)
  } catch {}

  session.subscribers.add(ws)

  // Resize if client dimensions differ
  if (session.cols !== cols || session.rows !== rows) {
    session.cols = cols
    session.rows = rows
    session.ptyProcess.resize(cols, rows)
  }

  return session
}

export function disconnect(name: string, ws: WebSocket): void {
  const session = sessions.get(name)
  if (session) {
    session.subscribers.delete(ws)
  }
}

export function write(name: string, data: string): void {
  const session = sessions.get(name)
  if (!session?.ptyProcess) return
  session.ptyProcess.write(data)
}

export function resize(name: string, cols: number, rows: number): void {
  const session = sessions.get(name)
  if (!session) return

  session.cols = cols
  session.rows = rows

  session.ptyProcess.resize(cols, rows)
}

export function kill(name: string): void {
  const session = sessions.get(name)
  if (!session) return

  for (const ws of session.subscribers) {
    try { ws.close(1000, 'session killed') } catch {}
  }
  session.subscribers.clear()

  try { session.ptyProcess.kill() } catch {}

  sessions.delete(name)
  log(`session ${name} killed`)
  bus.publish('pty.exited', { name, exitCode: -1 })
}

export function sessionCount(): number {
  return sessions.size
}

export function subscriberCount(): number {
  let count = 0
  for (const s of sessions.values()) {
    count += s.subscribers.size
  }
  return count
}

export function killAll(): void {
  for (const session of sessions.values()) {
    try { session.ptyProcess.kill() } catch {}
    for (const ws of session.subscribers) {
      try { ws.close(1001, 'server shutting down') } catch {}
    }
    session.subscribers.clear()
  }
  sessions.clear()
}

// ── Internal ─────────────────────────────────────────────────────

function wireSession(session: PtySession): void {
  // Batch PTY output per setImmediate — node-pty fires each onData in a
  // separate I/O callback, so queueMicrotask flushes between each one
  // (pending is always 0 = no batching). setImmediate runs after the
  // current I/O poll phase, collecting all onData events from one libuv
  // read cycle into a single WebSocket message.
  let pending: string[] = []
  let flushScheduled = false

  const flushPending = () => {
    flushScheduled = false
    if (pending.length === 0) return
    const batch = pending.join('')
    pending = []

    appendToBuffer(session, batch)

    for (const ws of session.subscribers) {
      try {
        ws.send(batch)
      } catch {
        session.subscribers.delete(ws)
      }
    }
  }

  session.ptyProcess.onData((data) => {
    // Feed OSC parser immediately (needs per-chunk accuracy)
    session.osc.feed(data)

    // Accumulate for batched send
    pending.push(data)
    if (!flushScheduled) {
      flushScheduled = true
      setImmediate(flushPending)
    }
  })

  session.ptyProcess.onExit(({ exitCode }) => {
    log(`session ${session.name} exited (code ${exitCode})`)

    for (const ws of session.subscribers) {
      try { ws.close(1000, `exited ${exitCode}`) } catch {}
    }
    session.subscribers.clear()

    sessions.delete(session.name)
    bus.publish('pty.exited', { name: session.name, exitCode })
  })

  // Wire OSC events
  session.osc.on('cwd-changed', (cwd: string) => {
    session.cwd = cwd
    bus.publish('cwd.changed', { name: session.name, cwd })
  })

  session.osc.on('title-changed', (title: string) => {
    session.title = title
    bus.publish('title.changed', { name: session.name, title })
  })

  session.osc.on('command-started', (command: string) => {
    session.currentCommand = command
    bus.publish('command.started', { name: session.name, command })
  })

  session.osc.on('command-finished', (command: string, exitCode: number, durationMs: number) => {
    session.currentCommand = undefined
    bus.publish('command.finished', { name: session.name, command, exitCode, durationMs })

    if (session.subscribers.size === 0 && durationMs > 5000) {
      const status = exitCode === 0 ? 'finished' : `failed (exit ${exitCode})`
      sendNotification('OpenOrca', `${command} ${status}`)
    }
  })
}
