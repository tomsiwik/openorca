/**
 * Default configuration values — mirrors Hyper's defaults.
 */
import type { ConfigOptions } from './schema'

export const defaultConfig: ConfigOptions = {
  fontSize: 12,
  fontFamily: 'Menlo, "DejaVu Sans Mono", "Lucida Console", monospace',
  fontWeight: 'normal',
  fontWeightBold: 'bold',
  lineHeight: 1,
  letterSpacing: 0,

  cursorColor: '#F81CE5',
  cursorAccentColor: '#000',
  cursorShape: 'BLOCK',
  cursorBlink: false,

  foregroundColor: '#fff',
  backgroundColor: '#000',
  selectionColor: 'rgba(248,28,229,0.3)',
  borderColor: '#333',
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

  shell: '',
  shellArgs: ['--login'],
  env: {},
  workingDirectory: '',

  scrollback: 1000,
  copyOnSelect: false,
  quickEdit: false,
  macOptionSelectionMode: 'vertical',
  preserveCWD: true,
  bell: 'SOUND',
  bellSound: null,
  bellSoundURL: null,

  padding: '12px 14px',
  windowSize: [540, 380],
  showWindowControls: true,
  showHamburgerMenu: '',

  updateChannel: 'stable',
  disableAutoUpdates: false,

  keymaps: {},

  defaultProfile: 'default',
  profiles: [{ name: 'default', config: {} }],
}
