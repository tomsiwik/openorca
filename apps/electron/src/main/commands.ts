/**
 * Command handlers — maps keybinding actions to renderer IPC or main process actions.
 * Ported from Hyper's commands.ts.
 */
import { app, BrowserWindow } from 'electron'

type CommandHandler = (focusedWindow?: BrowserWindow) => void

const commands: Record<string, CommandHandler> = {
  'window:new': () => {
    // Import dynamically to avoid circular dependency
    setTimeout(() => {
      const { createMainWindow } = require('./windows/main')
      createMainWindow()
    }, 0)
  },

  'tab:new': (win) => {
    if (win) {
      win.webContents.send('command', 'tab:new')
    } else {
      commands['window:new']()
    }
  },

  'pane:splitRight': (win) => {
    win?.webContents.send('command', 'pane:splitRight')
  },

  'pane:splitDown': (win) => {
    win?.webContents.send('command', 'pane:splitDown')
  },

  'pane:close': (win) => {
    win?.webContents.send('command', 'pane:close')
  },

  'pane:next': (win) => {
    win?.webContents.send('command', 'pane:next')
  },

  'pane:prev': (win) => {
    win?.webContents.send('command', 'pane:prev')
  },

  'window:preferences': (win) => {
    const target = win ?? BrowserWindow.getAllWindows()[0]
    target?.webContents.send('command', 'window:preferences')
  },

  'editor:clearBuffer': (win) => {
    win?.webContents.send('command', 'editor:clearBuffer')
  },

  'editor:selectAll': (win) => {
    win?.webContents.send('command', 'editor:selectAll')
  },

  'editor:search': (win) => {
    win?.webContents.send('command', 'editor:search')
  },

  'editor:search-close': (win) => {
    win?.webContents.send('command', 'editor:search-close')
  },

  'window:reload': (win) => {
    win?.webContents.reload()
  },

  'window:reloadFull': (win) => {
    win?.webContents.reloadIgnoringCache()
  },

  'window:devtools': (win) => {
    if (!win) return
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools()
    } else {
      win.webContents.openDevTools({ mode: 'detach' })
    }
  },

  'zoom:reset': (win) => {
    win?.webContents.send('command', 'zoom:reset')
  },

  'zoom:in': (win) => {
    win?.webContents.send('command', 'zoom:in')
  },

  'zoom:out': (win) => {
    win?.webContents.send('command', 'zoom:out')
  },

  'tab:prev': (win) => {
    win?.webContents.send('command', 'tab:prev')
  },

  'tab:next': (win) => {
    win?.webContents.send('command', 'tab:next')
  },

  'editor:movePreviousWord': (win) => {
    win?.webContents.send('command', 'editor:movePreviousWord')
  },

  'editor:moveNextWord': (win) => {
    win?.webContents.send('command', 'editor:moveNextWord')
  },

  'editor:moveBeginningLine': (win) => {
    win?.webContents.send('command', 'editor:moveBeginningLine')
  },

  'editor:moveEndLine': (win) => {
    win?.webContents.send('command', 'editor:moveEndLine')
  },

  'editor:deletePreviousWord': (win) => {
    win?.webContents.send('command', 'editor:deletePreviousWord')
  },

  'editor:deleteNextWord': (win) => {
    win?.webContents.send('command', 'editor:deleteNextWord')
  },

  'editor:deleteBeginningLine': (win) => {
    win?.webContents.send('command', 'editor:deleteBeginningLine')
  },

  'editor:deleteEndLine': (win) => {
    win?.webContents.send('command', 'editor:deleteEndLine')
  },

  'editor:break': (win) => {
    win?.webContents.send('command', 'editor:break')
  },

  'editor:undo': (win) => {
    win?.webContents.send('command', 'editor:undo')
  },

  'editor:redo': (win) => {
    win?.webContents.send('command', 'editor:redo')
  },

  'editor:cut': (win) => {
    win?.webContents.send('command', 'editor:cut')
  },

  'editor:copy': (win) => {
    win?.webContents.send('command', 'editor:copy')
  },

  'editor:paste': (win) => {
    win?.webContents.send('command', 'editor:paste')
  },

  'window:minimize': (win) => {
    win?.minimize()
  },

  'window:zoom': (win) => {
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  },

  'window:toggleFullScreen': (win) => {
    win?.setFullScreen(!win.isFullScreen())
  },

  'window:close': (win) => {
    win?.close()
  },

  'window:toggleKeepOnTop': (win) => {
    win?.setAlwaysOnTop(!win.isAlwaysOnTop())
  },
}

// Numeric tab jump commands (send 1-indexed, renderer converts)
for (const i of [1, 2, 3, 4, 5, 6, 7, 8] as const) {
  commands[`tab:jump:${i}`] = (win) => {
    win?.webContents.send('command', `tab:jump:${i}`)
  }
}
commands['tab:jump:last'] = (win) => {
  win?.webContents.send('command', 'tab:jump:last')
}

export function execCommand(command: string, focusedWindow?: BrowserWindow): void {
  const fn = commands[command]
  if (fn) {
    fn(focusedWindow)
  }
}

export function getCommandNames(): string[] {
  return Object.keys(commands)
}
