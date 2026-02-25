/**
 * Recursive split-pane renderer for the terminal group tree.
 */
import { useTermGroupsStore, useSessionsStore, useUIStore } from '../stores'
import { Terminal } from './terminal'
import { SplitPane } from './split-pane'
import { SearchBox } from './search-box'

interface TermGroupRendererProps {
  groupUid: string
}

export function TermGroupRenderer({ groupUid }: TermGroupRendererProps) {
  const termGroups = useTermGroupsStore((s) => s.termGroups)
  const activeUid = useSessionsStore((s) => s.activeUid)
  const borderColor = useUIStore((s) => s.borderColor)
  const resizePane = useTermGroupsStore((s) => s.resizePane)

  const group = termGroups[groupUid]
  if (!group) return null

  // Leaf node — render terminal
  if (group.sessionUid) {
    return <TerminalLeaf groupSessionUid={group.sessionUid} activeUid={activeUid} />
  }

  // Branch node — render split pane
  if (group.children.length === 0) return null

  const sizes = group.sizes ?? group.children.map(() => 1 / group.children.length)

  return (
    <SplitPane
      direction={group.direction ?? 'VERTICAL'}
      sizes={sizes}
      borderColor={borderColor}
      onResize={(newSizes) => resizePane(groupUid, newSizes)}
    >
      {group.children.map((childUid) => (
        <TermGroupRenderer key={childUid} groupUid={childUid} />
      ))}
    </SplitPane>
  )
}

/** Leaf node with reactive session subscription (for search toggle). */
function TerminalLeaf({ groupSessionUid, activeUid }: { groupSessionUid: string; activeUid: string | null }) {
  const session = useSessionsStore((s) => s.sessions[groupSessionUid])
  if (!session) return null

  return (
    <div className="relative flex-1 w-full h-full">
      <Terminal
        sessionUid={session.uid}
        ptyName={session.ptyName}
        isActive={session.uid === activeUid}
        onTitle={(title) => useSessionsStore.getState().setTitle(session.uid, title)}
      />
      <SearchBox
        isVisible={session.search}
        onClose={() => useSessionsStore.getState().setSearch(session.uid, false)}
      />
    </div>
  )
}
