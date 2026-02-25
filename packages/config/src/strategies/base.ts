import type { NormalizedConfig } from '../types'

export interface TerminalStrategy {
  name: string
  displayName: string
  detect(): string | null
  parse(configContent: string): NormalizedConfig
}

export const DEFAULT_CONFIG: NormalizedConfig = {
  fontFamily: 'Menlo, monospace',
  fontSize: 12,
  fontWeight: 'normal',
  fontWeightBold: 'bold',
  cursorShape: 'BLOCK',
  cursorBlink: false,
  scrollback: 1000,
}
