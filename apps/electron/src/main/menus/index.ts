/**
 * App menu builder — platform-specific menus with keybinding accelerators.
 * Ported from Hyper's menu system.
 */
import { app, Menu } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'

import { execCommand } from '../commands'
import { getKeymaps } from '../config'

function acceleratorFor(command: string): string | undefined {
  const keymaps = getKeymaps()
  const keys = keymaps[command]
  if (!keys || keys.length === 0) return undefined

  // Convert mousetrap format to Electron accelerator format
  const raw = keys[0]
  const parts = raw.split('+')
  const mapped = parts.map((part) => {
    const lower = part.toLowerCase()
    switch (lower) {
      case 'command': case 'cmd': return 'CmdOrCtrl'
      case 'ctrl': return 'Ctrl'
      case 'alt': return 'Alt'
      case 'shift': return 'Shift'
      case 'plus': return 'Plus'
      case 'esc': return 'Escape'
      case 'tab': return 'Tab'
      case 'enter': return 'Enter'
      case 'backspace': return 'Backspace'
      case 'delete': case 'del': return 'Delete'
      case 'left': return 'Left'
      case 'right': return 'Right'
      case 'up': return 'Up'
      case 'down': return 'Down'
      case 'home': return 'Home'
      case 'end': return 'End'
      case 'pageup': return 'PageUp'
      case 'pagedown': return 'PageDown'
      default:
        // F-keys
        if (/^f\d+$/.test(lower)) return lower.toUpperCase()
        // Single character keys — uppercase for Electron
        if (lower.length === 1) return lower.toUpperCase()
        // Symbols like =, -, [, ] — pass through
        return part
    }
  })
  return mapped.join('+')
}

/**
 * Build a menu item with accelerator displayed but NOT registered as a native shortcut.
 * The renderer's useGlobalHotkeys hook handles all keyboard shortcuts directly.
 */
function item(opts: MenuItemConstructorOptions): MenuItemConstructorOptions {
  if (opts.accelerator) {
    return { ...opts, registerAccelerator: false }
  }
  return opts
}

function cmd(command: string): () => void {
  return () => {
    const { BrowserWindow } = require('electron')
    const focused = BrowserWindow.getFocusedWindow()
    execCommand(command, focused ?? undefined)
  }
}

function shellMenu(): MenuItemConstructorOptions {
  return {
    label: process.platform === 'darwin' ? 'Shell' : 'File',
    submenu: [
      item({ label: 'New Window', accelerator: acceleratorFor('window:new'), click: cmd('window:new') }),
      item({ label: 'New Tab', accelerator: acceleratorFor('tab:new'), click: cmd('tab:new') }),
      { type: 'separator' },
      item({ label: 'Split Horizontally', accelerator: acceleratorFor('pane:splitDown'), click: cmd('pane:splitDown') }),
      item({ label: 'Split Vertically', accelerator: acceleratorFor('pane:splitRight'), click: cmd('pane:splitRight') }),
      { type: 'separator' },
      item({ label: 'Close Pane', accelerator: acceleratorFor('pane:close'), click: cmd('pane:close') }),
      item({ label: 'Close Window', accelerator: acceleratorFor('window:close'), click: cmd('window:close') }),
    ],
  }
}

function editMenu(): MenuItemConstructorOptions {
  return {
    label: 'Edit',
    submenu: [
      item({ label: 'Undo', accelerator: acceleratorFor('editor:undo'), click: cmd('editor:undo') }),
      item({ label: 'Redo', accelerator: acceleratorFor('editor:redo'), click: cmd('editor:redo') }),
      { type: 'separator' },
      item({ label: 'Cut', accelerator: acceleratorFor('editor:cut'), click: cmd('editor:cut') }),
      item({ label: 'Copy', accelerator: acceleratorFor('editor:copy'), click: cmd('editor:copy') }),
      item({ label: 'Paste', accelerator: acceleratorFor('editor:paste'), click: cmd('editor:paste') }),
      item({ label: 'Select All', accelerator: acceleratorFor('editor:selectAll'), click: cmd('editor:selectAll') }),
      { type: 'separator' },
      item({ label: 'Find', accelerator: acceleratorFor('editor:search'), click: cmd('editor:search') }),
      { type: 'separator' },
      item({ label: 'Clear Buffer', accelerator: acceleratorFor('editor:clearBuffer'), click: cmd('editor:clearBuffer') }),
      ...(process.platform === 'darwin' ? [] : [
        { type: 'separator' as const },
        item({ label: 'Preferences', accelerator: acceleratorFor('window:preferences'), click: cmd('window:preferences') }),
      ]),
    ],
  }
}

function viewMenu(): MenuItemConstructorOptions {
  return {
    label: 'View',
    submenu: [
      item({ label: 'Reload', accelerator: acceleratorFor('window:reload'), click: cmd('window:reload') }),
      item({ label: 'Full Reload', accelerator: acceleratorFor('window:reloadFull'), click: cmd('window:reloadFull') }),
      item({ label: 'Toggle Developer Tools', accelerator: acceleratorFor('window:devtools'), click: cmd('window:devtools') }),
      { type: 'separator' },
      item({ label: 'Reset Zoom', accelerator: acceleratorFor('zoom:reset'), click: cmd('zoom:reset') }),
      item({ label: 'Zoom In', accelerator: acceleratorFor('zoom:in'), click: cmd('zoom:in') }),
      item({ label: 'Zoom Out', accelerator: acceleratorFor('zoom:out'), click: cmd('zoom:out') }),
      { type: 'separator' },
      item({ label: 'Toggle Full Screen', accelerator: acceleratorFor('window:toggleFullScreen'), click: cmd('window:toggleFullScreen') }),
    ],
  }
}

function windowMenu(): MenuItemConstructorOptions {
  const submenu: MenuItemConstructorOptions[] = [
    item({ label: 'Minimize', accelerator: acceleratorFor('window:minimize'), click: cmd('window:minimize') }),
    item({ label: 'Zoom', accelerator: acceleratorFor('window:zoom'), click: cmd('window:zoom') }),
    { type: 'separator' },
    item({ label: 'Select Next Tab', accelerator: acceleratorFor('tab:next'), click: cmd('tab:next') }),
    item({ label: 'Select Previous Tab', accelerator: acceleratorFor('tab:prev'), click: cmd('tab:prev') }),
    { type: 'separator' },
    item({ label: 'Select Next Pane', accelerator: acceleratorFor('pane:next'), click: cmd('pane:next') }),
    item({ label: 'Select Previous Pane', accelerator: acceleratorFor('pane:prev'), click: cmd('pane:prev') }),
  ]

  // Tab jump shortcuts
  for (let i = 1; i <= 8; i++) {
    const jumpCmd = `tab:jump:${i}`
    const acc = acceleratorFor(jumpCmd)
    if (acc) {
      submenu.push(item({ label: `Select Tab ${i}`, accelerator: acc, click: cmd(jumpCmd) }))
    }
  }

  return { label: 'Window', submenu }
}

function helpMenu(): MenuItemConstructorOptions {
  return {
    label: 'Help',
    submenu: [
      ...(process.platform === 'darwin' ? [] : [
        {
          label: `About ${app.name}`,
          click: () => {
            const { dialog } = require('electron')
            dialog.showMessageBox({
              title: `About ${app.name}`,
              message: `${app.name} ${app.getVersion()}`,
              detail: 'A modern terminal emulator.',
              buttons: [],
            })
          },
        },
      ]),
    ],
  }
}

function darwinAppMenu(): MenuItemConstructorOptions {
  return {
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      item({ label: 'Preferences...', accelerator: acceleratorFor('window:preferences'), click: cmd('window:preferences') }),
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  }
}

export function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin' ? [darwinAppMenu()] : []),
    shellMenu(),
    editMenu(),
    viewMenu(),
    windowMenu(),
    helpMenu(),
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
