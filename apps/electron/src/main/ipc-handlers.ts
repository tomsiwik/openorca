/**
 * Register all ipcMain.handle/on listeners.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { ipcMain, BrowserWindow, shell } from 'electron'

import { getConfig, getKeymaps } from './config'
import { cfgPath } from './config/paths'
import { getServerInfo } from './server'
import { quitAndInstall } from './updater'

export function registerIpcHandlers(): void {
  // Server connection
  ipcMain.handle('get-server-info', () => {
    return getServerInfo()
  })

  // Config
  ipcMain.handle('get-config', () => {
    return getConfig()
  })

  ipcMain.handle('get-keymaps', () => {
    return getKeymaps()
  })

  // Window controls
  ipcMain.on('window-minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.on('window-close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  ipcMain.handle('window-is-maximized', (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  ipcMain.on('window-toggle-fullscreen', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.setFullScreen(!win.isFullScreen())
  })

  ipcMain.on('window-toggle-keep-on-top', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.setAlwaysOnTop(!win.isAlwaysOnTop())
  })

  ipcMain.on('window-devtools', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.webContents.toggleDevTools()
  })

  ipcMain.on('window-reload', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.webContents.reload()
  })

  ipcMain.on('window-reload-full', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) win.webContents.reloadIgnoringCache()
  })

  // Config file
  ipcMain.on('open-config', () => {
    shell.openPath(cfgPath)
  })

  // Raw config read/write (for in-app settings editor)
  ipcMain.handle('get-raw-config', () => {
    try {
      return JSON.parse(readFileSync(cfgPath, 'utf-8'))
    } catch {
      return {}
    }
  })

  ipcMain.handle('save-raw-config', (_event, rawConfig: unknown) => {
    try {
      writeFileSync(cfgPath, JSON.stringify(rawConfig, null, 2) + '\n', 'utf-8')
      return { ok: true }
    } catch (err: any) {
      return { ok: false, error: err.message }
    }
  })

  // Update
  ipcMain.on('quit-and-install', () => {
    quitAndInstall()
  })
}
