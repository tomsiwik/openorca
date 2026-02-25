/**
 * PtyConnectionManager — background service owning all PTY WebSocket connections.
 *
 * Connections live outside React's component lifecycle. Terminal components
 * subscribe/unsubscribe for data but don't control connection lifetime.
 * This prevents tab-close freezes and enables future multi-window support.
 */

export interface PtySubscriber {
  onData(data: string): void
  onBell?(): void
  onTitle?(title: string): void
  onReplayEnd?(): void
  onClose?(code: number, reason: string): void
}

export class PtyConnection {
  readonly ptyName: string
  private ws: WebSocket | null = null
  private subscribers = new Set<PtySubscriber>()
  private cursor = 0
  private replaying = true
  private replayChunks: string[] = []
  private writePending: string[] = []
  private writeScheduled = false
  private serverUrl: string
  private token: string

  constructor(ptyName: string, serverUrl: string, token: string) {
    this.ptyName = ptyName
    this.serverUrl = serverUrl
    this.token = token
  }

  connect(cols: number, rows: number): void {
    if (this.ws) return

    const wsUrl = this.serverUrl.replace(/^http/, 'ws')
    const ws = new WebSocket(
      `${wsUrl}/pty/${this.ptyName}/ws?cursor=${this.cursor}&cols=${cols}&rows=${rows}&token=${this.token}`,
    )
    ws.binaryType = 'arraybuffer'
    this.ws = ws
    this.replaying = true
    this.replayChunks = []

    ws.onmessage = (evt) => {
      if (evt.data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(evt.data)
        if (bytes[0] === 0x00) {
          try {
            const ctrl = JSON.parse(new TextDecoder().decode(bytes.slice(1)))
            if (typeof ctrl.cursor === 'number') {
              this.cursor = ctrl.cursor
            }
          } catch {}
          this.flushReplay()
        }
      } else if (typeof evt.data === 'string') {
        if (this.replaying) {
          this.replayChunks.push(evt.data)
        } else {
          this.scheduleWrite(evt.data)
        }
      }
    }

    ws.onclose = (evt) => {
      this.ws = null
      for (const sub of this.subscribers) {
        sub.onClose?.(evt.code, evt.reason)
      }
    }

    ws.onerror = () => {}
  }

  subscribe(sub: PtySubscriber): () => void {
    this.subscribers.add(sub)
    return () => { this.subscribers.delete(sub) }
  }

  send(data: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }

  resize(cols: number, rows: number): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const payload = new TextEncoder().encode('\x01' + JSON.stringify({ cols, rows }))
      this.ws.send(payload)
    }
  }

  destroy(): void {
    this.writePending = []
    this.writeScheduled = false
    if (this.ws) {
      this.ws.onclose = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.close()
      this.ws = null
    }
    this.subscribers.clear()

    // Kill backend PTY
    fetch(`${this.serverUrl}/pty/${this.ptyName}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.token}` },
    }).catch(() => {})
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /** Buffer incoming data and flush once per animation frame. */
  private scheduleWrite(data: string): void {
    this.writePending.push(data)
    if (!this.writeScheduled) {
      this.writeScheduled = true
      requestAnimationFrame(() => {
        this.writeScheduled = false
        if (this.writePending.length === 0) return
        const batch = this.writePending.join('')
        this.writePending = []
        this.emit(batch)
      })
    }
  }

  private flushReplay(): void {
    if (!this.replaying) return
    this.replaying = false
    if (this.replayChunks.length > 0) {
      const batch = this.replayChunks.join('')
      this.replayChunks = []
      this.emit(batch)
    }
    for (const sub of this.subscribers) {
      sub.onReplayEnd?.()
    }
  }

  private emit(data: string): void {
    for (const sub of this.subscribers) {
      sub.onData(data)
    }
  }

}

class PtyConnectionManager {
  private connections = new Map<string, PtyConnection>()
  private serverUrl: string | null = null
  private token: string | null = null

  setServerInfo(url: string, token: string): void {
    this.serverUrl = url
    this.token = token
  }

  create(ptyName: string, cols: number, rows: number): PtyConnection {
    if (this.connections.has(ptyName)) {
      return this.connections.get(ptyName)!
    }
    if (!this.serverUrl || !this.token) {
      throw new Error('PtyConnectionManager: server info not set')
    }
    const conn = new PtyConnection(ptyName, this.serverUrl, this.token)
    this.connections.set(ptyName, conn)
    conn.connect(cols, rows)
    return conn
  }

  get(ptyName: string): PtyConnection | undefined {
    return this.connections.get(ptyName)
  }

  destroy(ptyName: string): void {
    const conn = this.connections.get(ptyName)
    if (conn) {
      conn.destroy()
      this.connections.delete(ptyName)
    }
  }

  destroyAll(): void {
    for (const [name] of this.connections) {
      this.destroy(name)
    }
  }
}

export const ptyConnectionManager = new PtyConnectionManager()
