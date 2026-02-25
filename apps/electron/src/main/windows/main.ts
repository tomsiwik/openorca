/**
 * Main window creation — matches Hyper's default style.
 * macOS: native titlebar (hiddenInset), solid black background.
 * Win/Linux: frameless, solid black background.
 */
import { BrowserWindow, app } from 'electron'
import { join } from 'node:path'
import { createRequire } from 'node:module'

import { getConfig } from '../config'
import { getServerInfo } from '../server'
import { ENVIRONMENT, PLATFORM } from 'shared/constants'

const _require = createRequire(import.meta.url)

// Track all windows
export const windows = new Set<BrowserWindow>()

export function createMainWindow(): BrowserWindow {
  const config = getConfig()
  const [width, height] = config.windowSize || [540, 380]

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width,
    height,
    minWidth: 370,
    minHeight: 190,
    show: false,
    center: true,
    title: 'OpenOrca',
    autoHideMenuBar: true,
    backgroundColor: config.backgroundColor || '#000000',
    webPreferences: {
      preload: app.isPackaged
        ? join(__dirname, '../preload/index.js')
        : _require.resolve('@openorca/preload'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  }

  // Platform-specific window styling
  if (PLATFORM.IS_MAC) {
    Object.assign(windowOptions, {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 10, y: 10 },
    })
  } else {
    Object.assign(windowOptions, {
      frame: false,
    })
  }

  const window = new BrowserWindow(windowOptions)
  windows.add(window)

  // Load renderer
  if (ENVIRONMENT.IS_DEV && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Content Security Policy — only in production (Vite HMR needs inline scripts in dev)
  if (!ENVIRONMENT.IS_DEV) {
    window.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self';" +
            " script-src 'self' 'wasm-unsafe-eval';" +
            " style-src 'self' 'unsafe-inline';" +
            " connect-src 'self' ws://localhost:* http://localhost:*;" +
            " font-src 'self' data:;" +
            " img-src 'self' data:;" +
            " worker-src 'self' blob:;",
          ],
        },
      })
    })
  }

  window.webContents.on('did-finish-load', () => {
    window.show()
    // Push server info for windows created after server is already running
    const info = getServerInfo()
    if (info) window.webContents.send('server-ready', info)
  })

  // Maximize/unmaximize events
  window.on('maximize', () => {
    window.webContents.send('maximize-change', true)
  })
  window.on('unmaximize', () => {
    window.webContents.send('maximize-change', false)
  })

  // Focus/blur
  window.on('focus', () => {
    window.webContents.send('window-focus', true)
  })
  window.on('blur', () => {
    window.webContents.send('window-focus', false)
  })

  window.on('closed', () => {
    windows.delete(window)
  })

  return window
}
