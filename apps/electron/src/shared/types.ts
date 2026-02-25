import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'

export type BrowserWindowOrNull = Electron.BrowserWindow | null

export interface WindowProps extends Electron.BrowserWindowConstructorOptions {
  id?: string
}

export interface WindowCreationByIPC {
  channel: string
  window(): BrowserWindowOrNull
  callback(window: BrowserWindow, event: IpcMainInvokeEvent): void
}
