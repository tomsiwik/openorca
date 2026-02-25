/**
 * Auto-updater — uses electron-updater to check for and install updates from GitHub Releases.
 */
import pkg from 'electron-updater'
const { autoUpdater } = pkg
import type { BrowserWindow } from 'electron'

const CHECK_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    console.error('[updater] Update available:', info.version)
    mainWindow.webContents.send('update-available', { version: info.version })
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.error('[updater] Update downloaded:', info.version)
    mainWindow.webContents.send('update-downloaded', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    console.error('[updater] Error:', err.message)
  })

  // Initial check after 10s, then every 30 minutes
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 10_000)

  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, CHECK_INTERVAL_MS)
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}
