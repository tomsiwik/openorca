import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { TerminalStrategy } from './base'
import { DEFAULT_CONFIG } from './base'
import type { NormalizedConfig } from '../types'

export class WezTermStrategy implements TerminalStrategy {
  name = 'wezterm'
  displayName = 'WezTerm'

  detect(): string | null {
    const paths = [
      join(homedir(), '.wezterm.lua'),
      join(homedir(), '.config', 'wezterm', 'wezterm.lua'),
    ]
    for (const p of paths) {
      if (existsSync(p)) return p
    }
    return null
  }

  parse(content: string): NormalizedConfig {
    const config = { ...DEFAULT_CONFIG }

    // Extract first font from font_with_fallback or font()
    const fontFamily = content.match(/font_with_fallback.*?["']([^"']+)["']/s)?.[1]
      ?? content.match(/font\s*\(\s*["']([^"']+)["']/)?.[1]
    if (fontFamily) config.fontFamily = fontFamily

    const fontSize = content.match(/font_size\s*=\s*([0-9.]+)/)?.[1]
    if (fontSize) config.fontSize = parseFloat(fontSize)

    return config
  }
}
