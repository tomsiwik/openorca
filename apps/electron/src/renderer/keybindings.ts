/**
 * PTY lifecycle utilities — create tabs, split panes, close panes.
 * Keyboard shortcuts are handled by useGlobalHotkeys hook;
 * these functions are also called from menu click handlers via executeCommand().
 */
import { useSessionsStore, useTermGroupsStore, useUIStore } from './stores'
import { ptyConnectionManager } from './services/pty-connection'

/**
 * Create a new PTY session and tab.
 */
export async function createNewTab(): Promise<void> {
  const serverInfo = await window.api.getServerInfo()
  if (!serverInfo) return

  try {
    const res = await fetch(`${serverInfo.url}/pty`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serverInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cols: 80, rows: 24 }),
    })

    if (!res.ok) throw new Error(`Failed to create PTY: ${res.status}`)
    const { name: ptyName } = await res.json()

    // Establish WebSocket connection immediately via the connection manager
    ptyConnectionManager.create(ptyName, 80, 24)

    const uid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    useSessionsStore.getState().addSession({
      uid,
      title: '',
      shell: null,
      pid: null,
      cols: 80,
      rows: 24,
      ptyName,
      profile: 'default',
      search: false,
      cleared: false,
    })

    useTermGroupsStore.getState().addTab(uid)
  } catch (err) {
    console.error('[keybindings] Failed to create tab:', err)
  }
}

export async function splitPane(direction: 'HORIZONTAL' | 'VERTICAL'): Promise<void> {
  const activeUid = useSessionsStore.getState().activeUid
  if (!activeUid) return

  const serverInfo = await window.api.getServerInfo()
  if (!serverInfo) return

  try {
    const res = await fetch(`${serverInfo.url}/pty`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serverInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cols: 80, rows: 24 }),
    })

    if (!res.ok) throw new Error(`Failed to create PTY: ${res.status}`)
    const { name: ptyName } = await res.json()

    // Establish WebSocket connection immediately via the connection manager
    ptyConnectionManager.create(ptyName, 80, 24)

    const uid = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

    useSessionsStore.getState().addSession({
      uid,
      title: '',
      shell: null,
      pid: null,
      cols: 80,
      rows: 24,
      ptyName,
      profile: 'default',
      search: false,
      cleared: false,
    })

    if (direction === 'VERTICAL') {
      useTermGroupsStore.getState().splitVertical(activeUid, uid)
    } else {
      useTermGroupsStore.getState().splitHorizontal(activeUid, uid)
    }

    useSessionsStore.getState().setActive(uid)
  } catch (err) {
    console.error('[keybindings] Failed to split pane:', err)
  }
}

export function closeActivePane(): void {
  const sessions = useSessionsStore.getState()
  const termGroups = useTermGroupsStore.getState()
  const activeUid = sessions.activeUid
  if (!activeUid) return

  const session = sessions.sessions[activeUid]
  if (!session) return

  // Find the term group for this session
  const group = Object.values(termGroups.termGroups).find(g => g.sessionUid === activeUid)
  if (!group) return

  // Kill PTY via connection manager (closes WS + sends DELETE to backend)
  ptyConnectionManager.destroy(session.ptyName)

  // Find a sibling session to focus before removing
  const siblingUid = findSiblingSession(termGroups.termGroups, group)

  // Close the tab/pane in term groups first (restructures tree)
  termGroups.closeTab(group.uid)

  // Remove the session and set active to the sibling
  useSessionsStore.getState().removeSession(activeUid)

  // Explicitly set active to sibling if we found one — re-read fresh state
  if (siblingUid && useSessionsStore.getState().sessions[siblingUid]) {
    useSessionsStore.getState().setActive(siblingUid)
    useTermGroupsStore.getState().setActiveSession(siblingUid)
  }
  useSessionsStore.getState().requestFocus()
}

/**
 * Execute a command by name — used by menu click handlers (via main process IPC).
 */
export async function executeCommand(command: string): Promise<void> {
  const sessions = useSessionsStore.getState()
  const termGroups = useTermGroupsStore.getState()
  const ui = useUIStore.getState()

  switch (command) {
    case 'tab:new':
      await createNewTab()
      break

    case 'tab:next':
      termGroups.activateNextTab()
      break

    case 'tab:prev':
      termGroups.activatePrevTab()
      break

    case 'pane:splitRight':
      await splitPane('VERTICAL')
      break

    case 'pane:splitDown':
      await splitPane('HORIZONTAL')
      break

    case 'pane:close':
      closeActivePane()
      break

    case 'pane:next':
      termGroups.activateNextPane()
      break

    case 'pane:prev':
      termGroups.activatePrevPane()
      break

    case 'zoom:in':
      ui.increaseFontSize()
      useUIStore.getState().showFontNotification()
      break

    case 'zoom:out':
      ui.decreaseFontSize()
      useUIStore.getState().showFontNotification()
      break

    case 'zoom:reset':
      ui.resetFontSize()
      useUIStore.getState().showFontNotification()
      break

    case 'sidebar:toggle':
      ui.toggleSidebar()
      break

    case 'editor:search': {
      const activeUid = sessions.activeUid
      if (activeUid) {
        const session = sessions.sessions[activeUid]
        sessions.setSearch(activeUid, !session?.search)
      }
      break
    }

    case 'editor:search-close': {
      const activeUid = sessions.activeUid
      if (activeUid) {
        sessions.setSearch(activeUid, false)
      }
      break
    }

    case 'editor:clearBuffer':
      sessions.clearActive()
      break

    // Native clipboard/editing — use Electron's webContents methods via role-like behavior
    case 'editor:undo':
      document.execCommand('undo')
      break
    case 'editor:redo':
      document.execCommand('redo')
      break
    case 'editor:cut':
      document.execCommand('cut')
      break
    case 'editor:copy':
      document.execCommand('copy')
      break
    case 'editor:paste':
      document.execCommand('paste')
      break
    case 'editor:selectAll':
      document.execCommand('selectAll')
      break

    case 'window:preferences':
      ui.openSettingsTab()
      break

    case 'window:close':
      window.api.close()
      break

    case 'window:minimize':
      window.api.minimize()
      break

    case 'window:zoom':
      window.api.maximize()
      break

    case 'window:toggleFullScreen':
      window.api.toggleFullScreen()
      break

    case 'window:toggleKeepOnTop':
      window.api.toggleKeepOnTop()
      break

    case 'window:devtools':
      window.api.devtools()
      break

    case 'window:reload':
      window.api.reload()
      break

    case 'window:reloadFull':
      window.api.reloadFull()
      break

    case 'window:new':
      await createNewTab()
      break

    default:
      if (command.startsWith('tab:jump:')) {
        const idx = command.slice('tab:jump:'.length)
        if (idx === 'last') {
          termGroups.activateTab(-1)
        } else {
          // Commands use 1-indexed tab numbers, store uses 0-indexed
          termGroups.activateTab(parseInt(idx, 10) - 1)
        }
      }
      break
  }
}

/**
 * Find the best sibling session to focus when closing a pane.
 */
function findSiblingSession(
  termGroups: Record<string, import('./stores/term-groups').TermGroup>,
  closingGroup: import('./stores/term-groups').TermGroup,
): string | null {
  if (!closingGroup.parentUid) {
    const otherRoots = Object.values(termGroups).filter(
      g => !g.parentUid && g.uid !== closingGroup.uid
    )
    if (otherRoots.length === 0) return null
    return findFirstLeafSession(termGroups, otherRoots[0])
  }

  const parent = termGroups[closingGroup.parentUid]
  if (!parent) return null

  const siblings = parent.children.filter(c => c !== closingGroup.uid)
  if (siblings.length === 0) return null

  return findFirstLeafSession(termGroups, termGroups[siblings[0]])
}

function findFirstLeafSession(
  termGroups: Record<string, import('./stores/term-groups').TermGroup>,
  group: import('./stores/term-groups').TermGroup,
): string | null {
  if (!group) return null
  if (group.sessionUid) return group.sessionUid
  if (group.children.length === 0) return null
  const firstChild = termGroups[group.children[0]]
  return firstChild ? findFirstLeafSession(termGroups, firstChild) : null
}
