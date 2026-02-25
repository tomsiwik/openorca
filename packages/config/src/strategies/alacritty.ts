import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { TerminalStrategy } from './base'
import { DEFAULT_CONFIG } from './base'
import type { NormalizedConfig } from '../types'

export class AlacrittyStrategy implements TerminalStrategy {
  name = 'alacritty'
  displayName = 'Alacritty'

  detect(): string | null {
    const paths = [
      join(homedir(), '.config', 'alacritty', 'alacritty.toml'),
      join(homedir(), '.config', 'alacritty', 'alacritty.yml'),
    ]
    for (const p of paths) {
      if (existsSync(p)) return p
    }
    return null
  }

  parse(content: string): NormalizedConfig {
    const config = { ...DEFAULT_CONFIG }

    // TOML: family = "Font Name" or YAML: family: Font Name
    const fontFamily = content.match(/family\s*=\s*"([^"]+)"/)?.[1]
      ?? content.match(/family:\s*(.+)/)?.[1]?.trim()
    if (fontFamily) config.fontFamily = fontFamily

    // TOML: size = 14.0 or YAML: size: 14.0
    const fontSize = content.match(/size\s*=\s*([0-9.]+)/)?.[1]
      ?? content.match(/size:\s*([0-9.]+)/)?.[1]
    if (fontSize) config.fontSize = parseFloat(fontSize)

    return config
  }
}
