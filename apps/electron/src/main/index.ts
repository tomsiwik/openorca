/**
 * Electron main process entry point.
 * Lifecycle: setup config -> start backend server -> create window -> register IPC/menus.
 */
import { app, BrowserWindow } from 'electron'

import { setup as setupConfig, watchConfig, unwatchConfig } from './config'
import { startServer, stopServer } from './server'
import { registerIpcHandlers } from './ipc-handlers'
import { buildMenu } from './menus'
import { createMainWindow, windows } from './windows/main'
import { initAutoUpdater } from './updater'
import { ENVIRONMENT, PLATFORM } from 'shared/constants'

// Set app name before anything else — Electron derives it from package.json "name"
// which is "@openorca/electron". This controls menu bar, About, Hide/Quit labels.
app.name = 'OpenOrca'

if (PLATFORM.IS_MAC) {
  app.setAboutPanelOptions({
    applicationName: 'OpenOrca',
    applicationVersion: app.getVersion(),
    version: '', // hide build number
    copyright: `Copyright ${new Date().getFullYear()} OpenOrca`,
  })
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

app.on('second-instance', () => {
  // Focus existing window when a second instance is launched
  const win = BrowserWindow.getAllWindows()[0]
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

// Force GPU acceleration (Hyper 3 pattern — avoids software rendering fallback)
app.commandLine.appendSwitch('ignore-gpu-blacklist')

app.on('ready', async () => {
  setupConfig()
  registerIpcHandlers()
  buildMenu()

  // Start server and create window in parallel
  const serverPromise = startServer().catch((err) => {
    console.error('[main] Failed to start backend server:', err)
    return null
  })

  const mainWin = createMainWindow()

  // Push server info to renderer as soon as available — no polling needed
  const serverResult = await serverPromise
  if (serverResult) {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('server-ready', serverResult)
    }
  }

  if (mainWin) initAutoUpdater(mainWin)

  // 4. Watch config for changes
  watchConfig(windows)

  // Dev tools
  if (ENVIRONMENT.IS_DEV) {
    try {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = await import('electron-devtools-installer' as any)
      await installExtension(REACT_DEVELOPER_TOOLS)
    } catch {}
  }
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Re-create window on macOS dock click
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

// Cleanup on quit
app.on('before-quit', () => {
  unwatchConfig()
  stopServer()
})
