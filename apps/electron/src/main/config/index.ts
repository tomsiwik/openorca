/**
 * Config loading, watching, and merging.
 * Loads ~/.openorca/settings.json, scaffolds from existing terminal configs.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, watchFile, unwatchFile } from 'node:fs'
import type { BrowserWindow } from 'electron'
import { getDefaultConfig } from '@openorca/config'

import { cfgPath, cfgDir } from './paths'
import { defaultConfig } from './defaults'
import type { ConfigOptions, ParsedConfig, RawConfig } from './schema'

let cfg: ParsedConfig = { config: { ...defaultConfig }, keymaps: {} }
const watchers: Array<() => void> = []
let watching = false

function normalizeKeymaps(keymaps: Record<string, string | string[]>): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const [key, val] of Object.entries(keymaps)) {
    result[key] = Array.isArray(val) ? val : [val]
  }
  return result
}

function loadConfigFile(): RawConfig | null {
  if (!existsSync(cfgPath)) return null

  try {
    const source = readFileSync(cfgPath, 'utf-8')
    const parsed = JSON.parse(source)
    return parsed as RawConfig
  } catch (err) {
    console.error('[config] Error loading config:', err)
    return null
  }
}

function mergeConfig(userCfg: RawConfig): ParsedConfig {
  const merged: ConfigOptions = { ...defaultConfig }

  if (userCfg.config) {
    const user = userCfg.config
    for (const key of Object.keys(user) as Array<keyof ConfigOptions>) {
      const val = user[key]
      if (val !== undefined) {
        if (typeof merged[key] === 'object' && !Array.isArray(merged[key]) && typeof val === 'object' && !Array.isArray(val)) {
          ;(merged as any)[key] = { ...(merged as any)[key], ...val }
        } else {
          ;(merged as any)[key] = val
        }
      }
    }

    // Ensure profiles have at least one entry
    if (!merged.profiles || merged.profiles.length === 0) {
      merged.profiles = [{ name: 'default', config: {} }]
    }
    if (!merged.defaultProfile) {
      merged.defaultProfile = merged.profiles[0].name
    }
  }

  // Merge platform-specific keymaps with user overrides
  const platformKeymaps = loadPlatformKeymaps()
  const userKeymaps = userCfg.keymaps ? normalizeKeymaps(userCfg.keymaps) : {}
  const keymaps = { ...platformKeymaps, ...userKeymaps }

  return { config: merged, keymaps }
}

function loadPlatformKeymaps(): Record<string, string[]> {
  try {
    let keymapFile: string
    switch (process.platform) {
      case 'darwin':
        keymapFile = 'darwin'
        break
      case 'win32':
        keymapFile = 'win32'
        break
      default:
        keymapFile = 'linux'
    }

    // Keymaps are JSON files next to the compiled output
    const keymapPath = new URL(`../keymaps/${keymapFile}.json`, import.meta.url)
    const raw = readFileSync(keymapPath, 'utf-8')
    return normalizeKeymaps(JSON.parse(raw))
  } catch {
    return {}
  }
}

/**
 * Detect settings from existing terminal emulators on the system.
 * Delegates to @openorca/config which uses strategy pattern for each terminal.
 */
function detectExistingTerminalSettings(): Partial<ConfigOptions> {
  const normalized = getDefaultConfig()
  const detected: Partial<ConfigOptions> = {}

  // Map NormalizedConfig fields to ConfigOptions
  if (normalized.fontFamily) detected.fontFamily = normalized.fontFamily
  if (normalized.fontSize) detected.fontSize = normalized.fontSize
  if (normalized.fontWeight) detected.fontWeight = normalized.fontWeight
  if (normalized.fontWeightBold) detected.fontWeightBold = normalized.fontWeightBold
  if (normalized.cursorShape) detected.cursorShape = normalized.cursorShape
  if (normalized.cursorColor) detected.cursorColor = normalized.cursorColor
  if (normalized.cursorBlink !== undefined) detected.cursorBlink = normalized.cursorBlink
  if (normalized.foregroundColor) detected.foregroundColor = normalized.foregroundColor
  if (normalized.backgroundColor) detected.backgroundColor = normalized.backgroundColor
  if (normalized.scrollback) detected.scrollback = normalized.scrollback
  if (normalized.padding) detected.padding = normalized.padding
  if (normalized.colors) detected.colors = normalized.colors as ConfigOptions['colors']

  return detected
}

/**
 * Create the default settings.json if it doesn't exist.
 * Detects settings from existing terminal emulators.
 */
function scaffoldConfig(): void {
  if (existsSync(cfgPath)) return

  if (!existsSync(cfgDir)) mkdirSync(cfgDir, { recursive: true })

  const detected = detectExistingTerminalSettings()
  const config: RawConfig = {
    config: {
      ...detected,
    },
    keymaps: {},
  }

  try {
    writeFileSync(cfgPath, JSON.stringify(config, null, 2) + '\n', 'utf-8')
    console.log(`[config] Created default config at ${cfgPath}`)
    if (Object.keys(detected).length > 0) {
      console.log('[config] Imported settings from existing terminal:', Object.keys(detected).join(', '))
    }
  } catch (err) {
    console.error('[config] Failed to create default config:', err)
  }
}

export function setup(): void {
  scaffoldConfig()
  cfg = mergeConfig(loadConfigFile() ?? {})
}

export function getConfig(): ConfigOptions {
  return cfg.config
}

export function getKeymaps(): Record<string, string[]> {
  return cfg.keymaps
}

export function getProfileConfig(profileName: string): ConfigOptions {
  const { profiles, defaultProfile, ...baseConfig } = cfg.config
  const profile = profiles.find(p => p.name === profileName)
  if (!profile) return cfg.config

  const merged = { ...baseConfig } as any
  for (const [key, val] of Object.entries(profile.config)) {
    if (typeof merged[key] === 'object' && !Array.isArray(merged[key]) && typeof val === 'object' && !Array.isArray(val)) {
      merged[key] = { ...merged[key], ...val }
    } else {
      merged[key] = val
    }
  }

  return { ...merged, defaultProfile, profiles }
}

export function subscribe(fn: () => void): () => void {
  watchers.push(fn)
  return () => {
    const idx = watchers.indexOf(fn)
    if (idx >= 0) watchers.splice(idx, 1)
  }
}

export function watchConfig(windows: Set<BrowserWindow>): void {
  if (watching) return
  watching = true

  watchFile(cfgPath, { interval: 500 }, () => {
    setTimeout(() => {
      const userCfg = loadConfigFile()
      if (userCfg) {
        cfg = mergeConfig(userCfg)
      }

      for (const fn of watchers) fn()
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('config-change', cfg.config)
        }
      }
    }, 100)
  })
}

export function unwatchConfig(): void {
  if (!watching) return
  watching = false
  unwatchFile(cfgPath)
}
