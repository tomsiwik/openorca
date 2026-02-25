/**
 * Patch the stock Electron.app bundle name for macOS dev mode.
 * Without this, the menu bar shows "Electron" instead of "OpenOrca".
 * Safe to run on any platform — exits silently on non-macOS.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'darwin') process.exit(0)

const __dirname = dirname(fileURLToPath(import.meta.url))
const plist = resolve(__dirname, '../node_modules/electron/dist/Electron.app/Contents/Info.plist')

if (!existsSync(plist)) {
  console.warn('[patch-electron-name] Info.plist not found, skipping')
  process.exit(0)
}

try {
  execSync(`plutil -replace CFBundleName -string "OpenOrca" "${plist}"`)
  execSync(`plutil -replace CFBundleDisplayName -string "OpenOrca" "${plist}"`)
} catch (err) {
  console.warn('[patch-electron-name] Failed to patch:', err.message)
}
