/**
 * Stream parser for OSC escape sequences in raw PTY output.
 * Emits typed events via Node EventEmitter.
 *
 * Parses:
 * - OSC 7:   \x1b]7;file://hostname/path\x07  -> cwd-changed(path)
 * - OSC 133:  Shell integration markers A/B/C/D -> command lifecycle
 * - OSC 2:   \x1b]2;title\x07                 -> title-changed(title)
 */
import { EventEmitter } from 'node:events'

export interface OscEvents {
  'cwd-changed': (cwd: string) => void
  'command-started': (command: string) => void
  'command-finished': (command: string, exitCode: number, durationMs: number) => void
  'title-changed': (title: string) => void
}

type PromptPhase = 'idle' | 'prompt' | 'input' | 'running'

export class OscParser extends EventEmitter {
  private phase: PromptPhase = 'idle'
  private currentTitle = ''
  private currentCommand = ''
  private commandStartTime = 0

  private oscBuffer = ''
  private inOsc = false

  constructor() {
    super()
  }

  /**
   * Feed raw PTY output data. Scans for OSC sequences without
   * modifying the data — the full stream is still passed to the client.
   */
  feed(data: string): void {
    for (let i = 0; i < data.length; i++) {
      const ch = data[i]

      if (this.inOsc) {
        if (ch === '\x07') {
          this.handleOsc(this.oscBuffer)
          this.oscBuffer = ''
          this.inOsc = false
        } else if (ch === '\\' && this.oscBuffer.endsWith('\x1b')) {
          this.handleOsc(this.oscBuffer.slice(0, -1))
          this.oscBuffer = ''
          this.inOsc = false
        } else {
          this.oscBuffer += ch
          if (this.oscBuffer.length > 4096) {
            this.oscBuffer = ''
            this.inOsc = false
          }
        }
        continue
      }

      if (ch === '\x1b' && i + 1 < data.length && data[i + 1] === ']') {
        this.inOsc = true
        this.oscBuffer = ''
        i++
      }
    }
  }

  private handleOsc(content: string): void {
    const semiIdx = content.indexOf(';')
    if (semiIdx === -1) return

    const code = content.slice(0, semiIdx)
    const payload = content.slice(semiIdx + 1)

    switch (code) {
      case '7':
        this.handleOsc7(payload)
        break
      case '133':
        this.handleOsc133(payload)
        break
      case '2':
        this.handleOsc2(payload)
        break
    }
  }

  private handleOsc7(payload: string): void {
    try {
      const url = new URL(payload)
      if (url.protocol === 'file:') {
        const cwd = decodeURIComponent(url.pathname)
        this.emit('cwd-changed', cwd)
      }
    } catch {
      if (payload.startsWith('/')) {
        this.emit('cwd-changed', payload)
      }
    }
  }

  private handleOsc133(payload: string): void {
    const marker = payload[0]

    switch (marker) {
      case 'A':
        this.phase = 'prompt'
        break
      case 'B':
        this.phase = 'input'
        break
      case 'C':
        this.phase = 'running'
        this.currentCommand = this.currentTitle
        this.commandStartTime = Date.now()
        if (this.currentCommand) {
          this.emit('command-started', this.currentCommand)
        }
        break
      case 'D': {
        const exitCode = this.parseExitCode(payload)
        const durationMs = this.commandStartTime > 0 ? Date.now() - this.commandStartTime : 0
        const command = this.currentCommand

        this.phase = 'idle'
        if (command) {
          this.emit('command-finished', command, exitCode, durationMs)
        }
        this.currentCommand = ''
        this.commandStartTime = 0
        break
      }
    }
  }

  private handleOsc2(payload: string): void {
    this.currentTitle = payload.trim()
    this.emit('title-changed', this.currentTitle)
  }

  private parseExitCode(payload: string): number {
    const parts = payload.split(';')
    if (parts.length >= 2) {
      const code = parseInt(parts[1], 10)
      if (!isNaN(code)) return code
    }
    return 0
  }

  getPhase(): PromptPhase {
    return this.phase
  }
}
