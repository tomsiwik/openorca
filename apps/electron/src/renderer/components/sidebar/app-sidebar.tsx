/**
 * AppSidebar — vertical tab list replacing the horizontal tab bar.
 * Settings appears as a regular closeable tab alongside terminal tabs.
 * Resizable via drag handle on the right edge; width persisted to localStorage.
 */
import { useCallback, useRef } from 'react'
import { useSessionsStore, useTermGroupsStore, useUIStore } from '../../stores'
import { createNewTab } from '../../keybindings'
import { ptyConnectionManager } from '../../services/pty-connection'
import { cn } from 'renderer/lib/utils'

export function AppSidebar() {
  const termGroups = useTermGroupsStore((s) => s.termGroups)
  const activeRootGroup = useTermGroupsStore((s) => s.activeRootGroup)
  const activeSessions = useTermGroupsStore((s) => s.activeSessions)
  const sessions = useSessionsStore((s) => s.sessions)
  const sidebarOpen = useUIStore((s) => s.sidebarOpen)
  const sidebarWidth = useUIStore((s) => s.sidebarWidth)
  const settingsTabOpen = useUIStore((s) => s.settingsTabOpen)
  const activeView = useUIStore((s) => s.activeView)
  const borderColor = useUIStore((s) => s.borderColor)
  const isMac = window.api.platform === 'darwin'

  // ── Resize handle ──────────────────────────────────────────
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = useUIStore.getState().sidebarWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      const newWidth = startWidth.current + (ev.clientX - startX.current)
      useUIStore.getState().setSidebarWidth(newWidth)
    }

    const onMouseUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  // ── Tab helpers ────────────────────────────────────────────
  const rootGroups = Object.values(termGroups)
    .filter((g) => !g.parentUid)
    .sort((a, b) => a.uid.localeCompare(b.uid))

  function getTabTitle(group: (typeof rootGroups)[0]): string {
    const sessionUid = activeSessions[group.uid] ?? group.sessionUid
    if (sessionUid && sessions[sessionUid]) {
      return sessions[sessionUid].title || 'Shell'
    }
    return 'Shell'
  }

  function handleTerminalTabClick(groupUid: string) {
    useUIStore.getState().activateTerminalView()
    const sessionUid = activeSessions[groupUid]
    if (sessionUid) {
      useSessionsStore.getState().setActive(sessionUid)
      useTermGroupsStore.getState().setActiveSession(sessionUid)
    }
  }

  function handleClose(groupUid: string) {
    const sessionsToRemove: string[] = []
    function collectSessions(uid: string) {
      const g = termGroups[uid]
      if (!g) return
      if (g.sessionUid) sessionsToRemove.push(g.sessionUid)
      for (const child of g.children) collectSessions(child)
    }
    collectSessions(groupUid)

    useTermGroupsStore.getState().closeTab(groupUid)

    for (const sid of sessionsToRemove) {
      const session = sessions[sid]
      if (session) {
        ptyConnectionManager.destroy(session.ptyName)
        useSessionsStore.getState().removeSession(sid)
      }
    }

    // Focus the remaining active terminal after closing
    const newRootGroup = useTermGroupsStore.getState().activeRootGroup
    if (newRootGroup) {
      const newActiveSessions = useTermGroupsStore.getState().activeSessions
      const sessionUid = newActiveSessions[newRootGroup]
      if (sessionUid) {
        useSessionsStore.getState().setActive(sessionUid)
        useUIStore.getState().activateTerminalView()
      }
    }
    useSessionsStore.getState().requestFocus()
  }

  return (
    <div className="relative flex shrink-0 select-none">
      {/* Sidebar panel */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: sidebarOpen ? sidebarWidth : 0, transition: sidebarOpen ? undefined : 'width 0.2s ease-in-out' }}
      >
        {/* macOS traffic light spacer */}
        {isMac && <div className="h-[34px] shrink-0 drag" />}

        {/* Tab list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar">
          {rootGroups.map((group) => {
            const isActive = group.uid === activeRootGroup && activeView === 'terminal'
            return (
              <div
                key={group.uid}
                className={cn(
                  'group flex items-center gap-1.5 pl-2 pr-3 h-8 cursor-pointer relative no-drag',
                  isActive
                    ? 'text-white bg-white/10'
                    : 'text-white/60 hover:text-white hover:bg-white/5',
                )}
                style={isActive ? { boxShadow: 'inset -2px 0 0 0 white' } : undefined}
                onClick={() => handleTerminalTabClick(group.uid)}
                onMouseDown={(e) => {
                  if (e.button === 1) {
                    e.preventDefault()
                    handleClose(group.uid)
                  }
                }}
              >
                <span className="flex-1 truncate text-xs font-medium">
                  {getTabTitle(group)}
                </span>
                <button
                  className={cn(
                    'w-4 h-4 flex items-center justify-center rounded-sm shrink-0',
                    'opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity',
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClose(group.uid)
                  }}
                  aria-label="Close tab"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8">
                    <path fill="currentColor" d="M1 0L0 1l3 3-3 3 1 1 3-3 3 3 1-1-3-3 3-3-1-1-3 3z" />
                  </svg>
                </button>
              </div>
            )
          })}

          {/* Settings tab — rendered as a regular tab when open */}
          {settingsTabOpen && (
            <div
              className={cn(
                'group flex items-center gap-1.5 pl-2 pr-3 h-8 cursor-pointer relative no-drag',
                activeView === 'settings'
                  ? 'text-white bg-white/10'
                  : 'text-white/60 hover:text-white hover:bg-white/5',
              )}
              style={activeView === 'settings' ? { boxShadow: 'inset -2px 0 0 0 white' } : undefined}
              onClick={() => useUIStore.getState().activateSettingsTab()}
            >
              <span className="flex-1 truncate text-xs font-medium">Settings</span>
              <button
                className={cn(
                  'w-4 h-4 flex items-center justify-center rounded-sm shrink-0',
                  'opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity',
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  useUIStore.getState().closeSettingsTab()
                }}
                aria-label="Close tab"
              >
                <svg width="8" height="8" viewBox="0 0 8 8">
                  <path fill="currentColor" d="M1 0L0 1l3 3-3 3 1 1 3-3 3 3 1-1-3-3 3-3-1-1-3 3z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Footer: New Tab */}
        <div
          className="shrink-0 no-drag"
          style={{ borderTop: `1px solid ${borderColor}` }}
        >
          <button
            className="flex items-center gap-2 w-full pl-2 pr-3 h-8 text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
            onClick={() => createNewTab()}
            aria-label="New tab"
          >
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M6 0v12M0 6h12" />
            </svg>
            <span className="text-xs">New Tab</span>
          </button>
        </div>
      </div>

      {/* Resize handle — wide hit area, thin visible line */}
      {sidebarOpen && (
        <div
          className="relative z-10 w-0 shrink-0 cursor-col-resize group/resize"
          onMouseDown={onResizeStart}
        >
          <div className="absolute inset-y-0 left-0 w-[1px] bg-border transition-colors duration-300 group-hover/resize:bg-white/80" />
          <div className="absolute inset-y-0 -left-[4px] w-[9px]" />
        </div>
      )}
    </div>
  )
}
