/**
 * TypeScript types for the .hyper.js config file.
 * Ported from Hyper's typings/config.d.ts.
 */

export type ColorMap = {
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  lightBlack: string
  lightRed: string
  lightGreen: string
  lightYellow: string
  lightBlue: string
  lightMagenta: string
  lightCyan: string
  lightWhite: string
}

export interface ConfigOptions {
  // Font
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontWeightBold: string
  lineHeight: number
  letterSpacing: number

  // Cursor
  cursorColor: string
  cursorAccentColor: string
  cursorShape: 'BEAM' | 'UNDERLINE' | 'BLOCK'
  cursorBlink: boolean

  // Colors
  foregroundColor: string
  backgroundColor: string
  selectionColor: string
  borderColor: string
  colors: ColorMap

  // Shell
  shell: string
  shellArgs: string[]
  env: Record<string, string>
  workingDirectory: string

  // Terminal behavior
  scrollback: number
  copyOnSelect: boolean
  quickEdit: boolean
  macOptionSelectionMode: string
  preserveCWD: boolean
  bell: 'SOUND' | false
  bellSound: string | null
  bellSoundURL: string | null

  // Window
  padding: string
  windowSize: [number, number]
  showWindowControls: boolean | 'left' | ''
  showHamburgerMenu: boolean | ''

  // Updates
  updateChannel: 'stable' | 'canary'
  disableAutoUpdates: boolean

  // Keymaps (user overrides)
  keymaps: Record<string, string | string[]>

  // Profiles
  defaultProfile: string
  profiles: Array<{
    name: string
    config: Partial<ConfigOptions>
  }>
}

export interface RawConfig {
  config?: Partial<ConfigOptions>
  keymaps?: Record<string, string | string[]>
}

export interface ParsedConfig {
  config: ConfigOptions
  keymaps: Record<string, string[]>
}
