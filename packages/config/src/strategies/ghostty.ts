import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { TerminalStrategy } from './base'
import { DEFAULT_CONFIG } from './base'
import type { NormalizedConfig } from '../types'

function ensureHash(color: string): string {
  return color.startsWith('#') ? color : `#${color}`
}

export class GhosttyStrategy implements TerminalStrategy {
  name = 'ghostty'
  displayName = 'Ghostty'

  detect(): string | null {
    const paths = [
      join(homedir(), '.config', 'ghostty', 'config'),
      join(homedir(), 'Library', 'Application Support', 'com.mitchellh.ghostty', 'config'),
    ]
    for (const p of paths) {
      if (existsSync(p)) return p
    }
    return null
  }

  parse(content: string): NormalizedConfig {
    const config = { ...DEFAULT_CONFIG }

    const get = (key: string): string | undefined =>
      content.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'))?.[1]?.trim()

    const fontFamily = get('font-family')
    if (fontFamily) config.fontFamily = fontFamily

    const fontSize = get('font-size')
    if (fontSize) config.fontSize = parseFloat(fontSize)

    const bg = get('background')
    if (bg) config.backgroundColor = ensureHash(bg)

    const fg = get('foreground')
    if (fg) config.foregroundColor = ensureHash(fg)

    const cursor = get('cursor-color')
    if (cursor) config.cursorColor = ensureHash(cursor)

    const cursorShape = get('cursor-style')
    if (cursorShape) {
      const map: Record<string, NormalizedConfig['cursorShape']> = {
        block: 'BLOCK', bar: 'BEAM', underline: 'UNDERLINE',
      }
      if (map[cursorShape]) config.cursorShape = map[cursorShape]
    }

    return config
  }
}
