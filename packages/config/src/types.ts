export interface NormalizedConfig {
  fontFamily: string
  fontSize: number
  fontWeight: string
  fontWeightBold: string
  cursorShape: 'BLOCK' | 'BEAM' | 'UNDERLINE'
  cursorColor?: string
  cursorBlink: boolean
  foregroundColor?: string
  backgroundColor?: string
  scrollback: number
  padding?: string
  colors?: Record<string, string>
}

export interface TerminalInfo {
  name: string
  displayName: string
  configPath: string
  getConfig(): NormalizedConfig
}
