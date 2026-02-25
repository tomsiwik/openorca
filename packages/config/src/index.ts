import { readFileSync } from 'node:fs'
import type { TerminalStrategy } from './strategies/base'
import { DEFAULT_CONFIG } from './strategies/base'
import { KittyStrategy } from './strategies/kitty'
import { GhosttyStrategy } from './strategies/ghostty'
import { WezTermStrategy } from './strategies/wezterm'
import { AlacrittyStrategy } from './strategies/alacritty'
import type { NormalizedConfig, TerminalInfo } from './types'

export type { NormalizedConfig, TerminalInfo }
export type { TerminalStrategy }
export { normalizeFont, toCssWeight } from './normalize'

const strategies: TerminalStrategy[] = [
  new KittyStrategy(),
  new GhosttyStrategy(),
  new WezTermStrategy(),
  new AlacrittyStrategy(),
]

/**
 * Detect all installed terminal emulators and return their info.
 */
export function getTerminals(): TerminalInfo[] {
  const found: TerminalInfo[] = []

  for (const strategy of strategies) {
    const configPath = strategy.detect()
    if (!configPath) continue

    found.push({
      name: strategy.name,
      displayName: strategy.displayName,
      configPath,
      getConfig(): NormalizedConfig {
        const content = readFileSync(configPath, 'utf-8')
        return strategy.parse(content)
      },
    })
  }

  return found
}

/**
 * Return config from the first detected terminal, or defaults.
 */
export function getDefaultConfig(): NormalizedConfig {
  const terminals = getTerminals()
  if (terminals.length === 0) return { ...DEFAULT_CONFIG }

  try {
    const config = terminals[0].getConfig()
    console.log(`[config] Detected settings from ${terminals[0].displayName}`)
    return config
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}
