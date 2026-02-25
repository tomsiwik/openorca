import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { TerminalStrategy } from './base'
import { DEFAULT_CONFIG } from './base'
import type { NormalizedConfig } from '../types'
import { normalizeFont } from '../normalize'

const KITTY_COLOR_MAP: Record<string, string> = {
  '0': 'black', '1': 'red', '2': 'green', '3': 'yellow',
  '4': 'blue', '5': 'magenta', '6': 'cyan', '7': 'white',
  '8': 'lightBlack', '9': 'lightRed', '10': 'lightGreen', '11': 'lightYellow',
  '12': 'lightBlue', '13': 'lightMagenta', '14': 'lightCyan', '15': 'lightWhite',
}

export class KittyStrategy implements TerminalStrategy {
  name = 'kitty'
  displayName = 'Kitty'

  detect(): string | null {
    const p = join(homedir(), '.config', 'kitty', 'kitty.conf')
    return existsSync(p) ? p : null
  }

  parse(content: string): NormalizedConfig {
    const config = { ...DEFAULT_CONFIG }

    const get = (key: string): string | undefined =>
      content.match(new RegExp(`^${key}\\s+(.+)$`, 'm'))?.[1]?.trim()

    // Font
    const fontFamily = get('font_family')
    if (fontFamily) {
      const { family, weight } = normalizeFont(fontFamily)
      config.fontFamily = family
      config.fontWeight = weight
    }

    const boldFont = get('bold_font')
    if (boldFont && boldFont !== 'auto') {
      const { weight } = normalizeFont(boldFont)
      config.fontWeightBold = weight
    }

    const fontSize = get('font_size')
    if (fontSize) config.fontSize = parseFloat(fontSize)

    // Cursor
    const cursorShape = get('cursor_shape')
    if (cursorShape) {
      const map: Record<string, NormalizedConfig['cursorShape']> = {
        block: 'BLOCK', beam: 'BEAM', underline: 'UNDERLINE',
      }
      if (map[cursorShape]) config.cursorShape = map[cursorShape]
    }

    const cursorBlink = get('cursor_blink_interval')
    if (cursorBlink) config.cursorBlink = parseFloat(cursorBlink) > 0

    const cursor = get('cursor')
    if (cursor) config.cursorColor = cursor

    // Colors
    const fg = get('foreground')
    if (fg) config.foregroundColor = fg

    const bg = get('background')
    if (bg) config.backgroundColor = bg

    // Scrollback
    const scrollback = get('scrollback_lines')
    if (scrollback) config.scrollback = parseInt(scrollback, 10)

    // Padding
    const padding = get('window_padding_width')
    if (padding) config.padding = `${padding}px`

    // ANSI colors
    const colors: Record<string, string> = {}
    let hasColors = false
    for (const [num, name] of Object.entries(KITTY_COLOR_MAP)) {
      const match = content.match(new RegExp(`^color${num}\\s+(#[0-9a-fA-F]+)$`, 'm'))
      if (match) {
        colors[name] = match[1]
        hasColors = true
      }
    }
    if (hasColors) config.colors = colors

    return config
  }
}
