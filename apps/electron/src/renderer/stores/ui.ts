/**
 * UI state store — font, colors, terminal behavior, window state.
 * Ported from OpenOrca's ui reducer to Zustand.
 */
import { create } from 'zustand'
import { normalizeFont } from '@openorca/config/normalize'
import type { ColorMap } from '../../main/config/schema'

interface UIStore {
  // Font
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontWeightBold: string
  lineHeight: number
  letterSpacing: number

  // Colors
  foregroundColor: string
  backgroundColor: string
  borderColor: string
  cursorColor: string
  cursorAccentColor: string
  cursorShape: 'BEAM' | 'UNDERLINE' | 'BLOCK'
  cursorBlink: boolean
  selectionColor: string
  colors: ColorMap

  // Terminal behavior
  scrollback: number
  copyOnSelect: boolean
  bell: 'SOUND' | false
  quickEdit: boolean
  macOptionSelectionMode: string
  preserveCWD: boolean
  padding: string
  showWindowControls: boolean | 'left' | ''
  showHamburgerMenu: boolean | ''

  // Window
  isMaximized: boolean
  isFullScreen: boolean

  // Sidebar
  sidebarOpen: boolean
  sidebarWidth: number
  settingsTabOpen: boolean
  activeView: 'terminal' | 'settings'

  // Notifications
  notifications: {
    font: boolean
    resize: boolean
    updates: boolean
    message: boolean
    copied: boolean
  }
  resizeCols: number
  resizeRows: number
  updateVersion: string | null
  updateNotes: string | null
  messageText: string | null
  messageURL: string | null

  // Actions
  increaseFontSize: () => void
  decreaseFontSize: () => void
  resetFontSize: () => void
  setMaximized: (v: boolean) => void
  setFullScreen: (v: boolean) => void
  applyConfig: (config: any) => void
  dismissNotification: (id: string) => void
  showFontNotification: () => void
  showResizeNotification: (cols: number, rows: number) => void
  showCopiedNotification: () => void
  setUpdateVersion: (version: string) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  openSettingsTab: () => void
  closeSettingsTab: () => void
  activateSettingsTab: () => void
  activateTerminalView: () => void

}

export const useUIStore = create<UIStore>((set, get) => ({
  fontSize: 12,
  fontFamily: 'Menlo, "DejaVu Sans Mono", "Lucida Console", monospace',
  fontWeight: 'normal',
  fontWeightBold: 'bold',
  lineHeight: 1,
  letterSpacing: 0,

  foregroundColor: '#fff',
  backgroundColor: '#000',
  borderColor: '#333',
  cursorColor: '#F81CE5',
  cursorAccentColor: '#000',
  cursorShape: 'BLOCK',
  cursorBlink: false,
  selectionColor: 'rgba(248,28,229,0.3)',
  colors: {
    black: '#000000',
    red: '#C51E14',
    green: '#1DC121',
    yellow: '#C7C329',
    blue: '#0A2FC4',
    magenta: '#C839C5',
    cyan: '#20C5C6',
    white: '#C7C7C7',
    lightBlack: '#686868',
    lightRed: '#FD6F6B',
    lightGreen: '#67F86F',
    lightYellow: '#FFFA72',
    lightBlue: '#6A76FB',
    lightMagenta: '#FD7CFC',
    lightCyan: '#68FDFE',
    lightWhite: '#FFFFFF',
  },

  scrollback: 1000,
  copyOnSelect: false,
  bell: 'SOUND',
  quickEdit: false,
  macOptionSelectionMode: 'vertical',
  preserveCWD: true,
  padding: '12px',
  showWindowControls: true,
  showHamburgerMenu: '',

  isMaximized: false,
  isFullScreen: false,

  sidebarOpen: true,
  sidebarWidth: Number(localStorage.getItem('orca-sidebar-width')) || 180,
  settingsTabOpen: false,
  activeView: 'terminal',

  notifications: {
    font: false,
    resize: false,
    updates: false,
    message: false,
    copied: false,
  },
  resizeCols: 0,
  resizeRows: 0,
  updateVersion: null,
  updateNotes: null,
  messageText: null,
  messageURL: null,

  increaseFontSize: () => {
    const size = Math.min(get().fontSize + 1, 40)
    set({ fontSize: size })
    persistFontSize(size)
  },

  decreaseFontSize: () => {
    const size = Math.max(get().fontSize - 1, 6)
    set({ fontSize: size })
    persistFontSize(size)
  },

  resetFontSize: () => {
    set({ fontSize: 12 })
    persistFontSize(12)
  },

  setMaximized: (v) => set({ isMaximized: v }),
  setFullScreen: (v) => set({ isFullScreen: v }),

  applyConfig: (config) => set((state) => {
    const updates: Partial<UIStore> = {}

    if (config.fontSize) updates.fontSize = config.fontSize
    if (config.fontFamily) {
      const { family, weight } = normalizeFont(config.fontFamily)
      updates.fontFamily = family
      if (!config.fontWeight) updates.fontWeight = weight
    }
    if (config.fontWeight) updates.fontWeight = config.fontWeight
    if (config.fontWeightBold) updates.fontWeightBold = config.fontWeightBold
    if (Number.isFinite(config.lineHeight)) updates.lineHeight = config.lineHeight
    if (Number.isFinite(config.letterSpacing)) updates.letterSpacing = config.letterSpacing
    if (config.cursorColor) updates.cursorColor = config.cursorColor
    if (config.cursorAccentColor) updates.cursorAccentColor = config.cursorAccentColor
    if (config.cursorShape) updates.cursorShape = config.cursorShape
    if (config.cursorBlink !== undefined) updates.cursorBlink = config.cursorBlink
    if (config.foregroundColor) updates.foregroundColor = config.foregroundColor
    if (config.backgroundColor) updates.backgroundColor = config.backgroundColor
    if (config.borderColor) updates.borderColor = config.borderColor
    if (config.selectionColor) updates.selectionColor = config.selectionColor
    if (config.colors) updates.colors = config.colors
    if (config.scrollback) updates.scrollback = config.scrollback
    if (config.copyOnSelect !== undefined) updates.copyOnSelect = config.copyOnSelect
    if (config.bell !== undefined) updates.bell = config.bell
    if (config.quickEdit !== undefined) updates.quickEdit = config.quickEdit
    if (config.macOptionSelectionMode) updates.macOptionSelectionMode = config.macOptionSelectionMode
    if (config.preserveCWD !== undefined) updates.preserveCWD = config.preserveCWD
    if (config.padding !== undefined) updates.padding = config.padding

    return updates as any
  }),

  dismissNotification: (id) => set((state) => ({
    notifications: { ...state.notifications, [id]: false },
  })),

  showFontNotification: () => {
    set({ notifications: { ...get().notifications, font: true } })
    setTimeout(() => {
      set((s) => ({ notifications: { ...s.notifications, font: false } }))
    }, 1000)
  },

  showResizeNotification: (cols, rows) => {
    set({ resizeCols: cols, resizeRows: rows, notifications: { ...get().notifications, resize: true } })
    setTimeout(() => {
      set((s) => ({ notifications: { ...s.notifications, resize: false } }))
    }, 1000)
  },

  showCopiedNotification: () => {
    set({ notifications: { ...get().notifications, copied: true } })
    setTimeout(() => {
      set((s) => ({ notifications: { ...s.notifications, copied: false } }))
    }, 1500)
  },

  setUpdateVersion: (version) => set({ updateVersion: version }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setSidebarWidth: (width) => {
    const clamped = Math.max(120, Math.min(400, width))
    localStorage.setItem('orca-sidebar-width', String(clamped))
    set({ sidebarWidth: clamped })
  },

  openSettingsTab: () => set({ settingsTabOpen: true, activeView: 'settings' }),

  closeSettingsTab: () => set({ settingsTabOpen: false, activeView: 'terminal' }),

  activateSettingsTab: () => set({ activeView: 'settings' }),

  activateTerminalView: () => set({ activeView: 'terminal' }),
}))

function persistFontSize(size: number) {
  window.api.getRawConfig().then((raw) => {
    raw.config = { ...raw.config, fontSize: size }
    window.api.saveRawConfig(raw)
  })
}
