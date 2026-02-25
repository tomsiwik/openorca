/**
 * Theme store — manages CSS variable injection and terminal colors.
 * Bridges Orca config colors into the theme system.
 */
import { create } from 'zustand'
import type { Theme, TerminalColors } from '../themes/types'
import { darkTheme } from '../themes/dark'

interface ThemeStore {
  activeTheme: Theme
  setTheme: (theme: Theme) => void
  applyThemeToDOM: () => void
  applyConfigColors: (config: any) => void
  getTerminalColors: () => TerminalColors
}

function injectCSSVariables(ui: Theme['ui'], terminal?: TerminalColors): void {
  const root = document.documentElement.style
  root.setProperty('--background', ui.background)
  root.setProperty('--foreground', ui.foreground)
  root.setProperty('--card', ui.card)
  root.setProperty('--card-foreground', ui.cardForeground)
  root.setProperty('--popover', ui.popover)
  root.setProperty('--popover-foreground', ui.popoverForeground)
  root.setProperty('--primary', ui.primary)
  root.setProperty('--primary-foreground', ui.primaryForeground)
  root.setProperty('--secondary', ui.secondary)
  root.setProperty('--secondary-foreground', ui.secondaryForeground)
  root.setProperty('--muted', ui.muted)
  root.setProperty('--muted-foreground', ui.mutedForeground)
  root.setProperty('--accent', ui.accent)
  root.setProperty('--accent-foreground', ui.accentForeground)
  root.setProperty('--destructive', ui.destructive)
  root.setProperty('--destructive-foreground', ui.destructiveForeground)
  root.setProperty('--border', ui.border)
  root.setProperty('--input', ui.input)
  root.setProperty('--ring', ui.ring)

  // Orca-style CSS variables for border/background
  if (terminal) {
    root.setProperty('--orca-background-color', terminal.background)
    root.setProperty('--orca-foreground-color', terminal.foreground)
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  activeTheme: darkTheme,

  setTheme: (theme) => {
    set({ activeTheme: theme })
    injectCSSVariables(theme.ui)
  },

  applyThemeToDOM: () => {
    const { activeTheme } = get()
    injectCSSVariables(activeTheme.ui, activeTheme.terminal)
  },

  applyConfigColors: (config) => {
    if (!config) return

    set((state) => {
      const theme = { ...state.activeTheme }

      // Map Orca config colors to terminal colors
      if (config.backgroundColor || config.foregroundColor || config.cursorColor || config.colors) {
        const terminal: TerminalColors = {
          ...(theme.terminal ?? {
            background: '#000000',
            foreground: '#ffffff',
            cursor: '#F81CE5',
            black: '#000000', red: '#C51E14', green: '#1DC121', yellow: '#C7C329',
            blue: '#0A2FC4', magenta: '#C839C5', cyan: '#20C5C6', white: '#C7C7C7',
            brightBlack: '#686868', brightRed: '#FD6F6B', brightGreen: '#67F86F', brightYellow: '#FFFA72',
            brightBlue: '#6A76FB', brightMagenta: '#FD7CFC', brightCyan: '#68FDFE', brightWhite: '#FFFFFF',
          }),
        }

        if (config.backgroundColor) terminal.background = config.backgroundColor
        if (config.foregroundColor) terminal.foreground = config.foregroundColor
        if (config.cursorColor) terminal.cursor = config.cursorColor
        if (config.selectionColor) terminal.selectionBackground = config.selectionColor

        if (config.colors) {
          const c = config.colors
          if (c.black) terminal.black = c.black
          if (c.red) terminal.red = c.red
          if (c.green) terminal.green = c.green
          if (c.yellow) terminal.yellow = c.yellow
          if (c.blue) terminal.blue = c.blue
          if (c.magenta) terminal.magenta = c.magenta
          if (c.cyan) terminal.cyan = c.cyan
          if (c.white) terminal.white = c.white
          if (c.lightBlack) terminal.brightBlack = c.lightBlack
          if (c.lightRed) terminal.brightRed = c.lightRed
          if (c.lightGreen) terminal.brightGreen = c.lightGreen
          if (c.lightYellow) terminal.brightYellow = c.lightYellow
          if (c.lightBlue) terminal.brightBlue = c.lightBlue
          if (c.lightMagenta) terminal.brightMagenta = c.lightMagenta
          if (c.lightCyan) terminal.brightCyan = c.lightCyan
          if (c.lightWhite) terminal.brightWhite = c.lightWhite
        }

        theme.terminal = terminal
      }

      return { activeTheme: theme }
    })

    get().applyThemeToDOM()
  },

  getTerminalColors: () => {
    const { activeTheme } = get()
    return activeTheme.terminal ?? {
      background: '#000000',
      foreground: '#ffffff',
      cursor: '#F81CE5',
      black: '#000000', red: '#C51E14', green: '#1DC121', yellow: '#C7C329',
      blue: '#0A2FC4', magenta: '#C839C5', cyan: '#20C5C6', white: '#C7C7C7',
      brightBlack: '#686868', brightRed: '#FD6F6B', brightGreen: '#67F86F', brightYellow: '#FFFA72',
      brightBlue: '#6A76FB', brightMagenta: '#FD7CFC', brightCyan: '#68FDFE', brightWhite: '#FFFFFF',
    }
  },
}))
