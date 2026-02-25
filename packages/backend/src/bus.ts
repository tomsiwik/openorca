/**
 * Typed event bus for internal pub/sub.
 * Events published by PtyManager, consumed by routes and IPC.
 */
import { EventEmitter } from 'node:events'

export interface BusEvents {
  'pty.created': { name: string; cwd?: string }
  'pty.exited': { name: string; exitCode: number }
  'cwd.changed': { name: string; cwd: string }
  'command.started': { name: string; command: string }
  'command.finished': { name: string; command: string; exitCode: number; durationMs: number }
  'title.changed': { name: string; title: string }
}

export type BusEventType = keyof BusEvents

class Bus extends EventEmitter {
  publish<T extends BusEventType>(type: T, data: BusEvents[T]): void {
    this.emit(type, data)
    this.emit('*', { type, ...data })
  }

  subscribe(handler: (event: { type: string; [key: string]: unknown }) => void): () => void {
    this.on('*', handler)
    return () => this.off('*', handler)
  }
}

export const bus = new Bus()
