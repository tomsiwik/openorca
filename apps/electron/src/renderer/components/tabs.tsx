/**
 * Tab strip — Orca-style horizontal tab navigation.
 * Single tab shows centered title. Multiple tabs show tab bar.
 */
import { useSessionsStore, useTermGroupsStore, useUIStore } from '../stores'
import { Tab } from './tab'

interface TabsProps {
  onNewTab: () => void
}

export function Tabs({ onNewTab }: TabsProps) {
  const termGroups = useTermGroupsStore((s) => s.termGroups)
  const activeRootGroup = useTermGroupsStore((s) => s.activeRootGroup)
  const activeSessions = useTermGroupsStore((s) => s.activeSessions)
  const sessions = useSessionsStore((s) => s.sessions)
  const borderColor = useUIStore((s) => s.borderColor)

  // Get root groups (tabs)
  const rootGroups = Object.values(termGroups).filter((g) => !g.parentUid)
  const isMac = window.api.platform === 'darwin'
  const singleTab = rootGroups.length <= 1

  function getTabTitle(group: typeof rootGroups[0]): string {
    const sessionUid = activeSessions[group.uid] ?? group.sessionUid
    if (sessionUid && sessions[sessionUid]) {
      return sessions[sessionUid].title || 'Shell'
    }
    return 'Shell'
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
        window.api.getServerInfo().then((info) => {
          if (info) {
            fetch(`${info.url}/pty/${session.ptyName}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${info.token}` },
            }).catch(() => {})
          }
        })
        useSessionsStore.getState().removeSession(sid)
      }
    }
  }

  function handleClick(groupUid: string) {
    const sessionUid = activeSessions[groupUid]
    if (sessionUid) {
      useSessionsStore.getState().setActive(sessionUid)
      useTermGroupsStore.getState().setActiveSession(sessionUid)
    }
  }

  // Single tab — show centered title (Orca style on macOS)
  if (singleTab && isMac) {
    const title = rootGroups[0] ? getTabTitle(rootGroups[0]) : 'Shell'
    return (
      <div className="flex items-center justify-center h-full px-[76px]">
        <span className="text-xs text-white/60 truncate">{title}</span>
      </div>
    )
  }

  return (
    <div className="flex items-stretch h-full overflow-x-auto hide-scrollbar">
      {rootGroups.map((group, i) => (
        <Tab
          key={group.uid}
          uid={group.uid}
          title={getTabTitle(group)}
          isActive={group.uid === activeRootGroup}
          isFirst={i === 0}
          borderColor={borderColor}
          onClick={() => handleClick(group.uid)}
          onClose={() => handleClose(group.uid)}
        />
      ))}
      <button
        className="flex items-center justify-center w-9 h-full text-white/40 hover:text-white/80 transition-colors"
        onClick={onNewTab}
        aria-label="New tab"
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path fill="none" stroke="currentColor" strokeWidth="1.5" d="M6 0v12M0 6h12" />
        </svg>
      </button>
    </div>
  )
}
