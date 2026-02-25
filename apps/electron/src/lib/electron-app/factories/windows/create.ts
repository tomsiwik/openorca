import { BrowserWindow } from 'electron'
import { join } from 'node:path'

export function createWindow(settings: Electron.BrowserWindowConstructorOptions) {
  const window = new BrowserWindow(settings)

  window.on('closed', window.destroy)

  return window
}
