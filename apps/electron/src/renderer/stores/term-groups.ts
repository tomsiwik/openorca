/**
 * Terminal groups store — manages tab/pane tree.
 * Ported from OpenOrca's term-groups reducer to Zustand.
 */
import { create } from 'zustand'
import { useSessionsStore } from './sessions'

export interface TermGroup {
  uid: string
  sessionUid: string | null
  parentUid: string | null
  direction: 'HORIZONTAL' | 'VERTICAL' | null
  sizes: number[] | null
  children: string[]
}

interface TermGroupsStore {
  termGroups: Record<string, TermGroup>
  activeSessions: Record<string, string>
  activeRootGroup: string | null

  // Tab management
  addTab: (sessionUid: string) => string
  closeTab: (uid: string) => void

  // Split management
  splitVertical: (activeSessionUid: string, newSessionUid: string) => void
  splitHorizontal: (activeSessionUid: string, newSessionUid: string) => void

  // Navigation
  setActiveSession: (sessionUid: string) => void
  activateNextTab: () => void
  activatePrevTab: () => void
  activateTab: (index: number) => void
  activateNextPane: () => void
  activatePrevPane: () => void

  // Pane sizing
  resizePane: (uid: string, sizes: number[]) => void

  // Helpers
  getRootGroups: () => TermGroup[]
  getActiveRootGroup: () => TermGroup | null
  _split: (activeSessionUid: string, newSessionUid: string, direction: 'HORIZONTAL' | 'VERTICAL') => void
}

const MIN_SIZE = 0.05

let uidCounter = 0
function genUid(): string {
  return `tg-${Date.now()}-${++uidCounter}`
}

function findGroupBySession(
  termGroups: Record<string, TermGroup>,
  sessionUid: string,
): TermGroup | null {
  for (const group of Object.values(termGroups)) {
    if (group.sessionUid === sessionUid) return group
  }
  return null
}

function findRootGroup(termGroups: Record<string, TermGroup>, uid: string): TermGroup {
  const current = termGroups[uid]
  if (!current.parentUid) return current
  return findRootGroup(termGroups, current.parentUid)
}

function insertRebalance(oldSizes: number[], index: number): number[] {
  const newSize = 1 / (oldSizes.length + 1)
  const balanced = oldSizes.map((size) => size - newSize * size)
  return [...balanced.slice(0, index), newSize, ...balanced.slice(index)]
}

function removalRebalance(oldSizes: number[], index: number): number[] {
  const removedSize = oldSizes[index]
  const increase = removedSize / (oldSizes.length - 1)
  return oldSizes.filter((_, i) => i !== index).map((size) => size + increase)
}

/**
 * Collect all leaf session UIDs under a group tree, in order.
 */
function collectLeafSessions(termGroups: Record<string, TermGroup>, groupUid: string): string[] {
  const group = termGroups[groupUid]
  if (!group) return []
  if (group.sessionUid) return [group.sessionUid]
  const sessions: string[] = []
  for (const childUid of group.children) {
    sessions.push(...collectLeafSessions(termGroups, childUid))
  }
  return sessions
}

export const useTermGroupsStore = create<TermGroupsStore>((set, get) => ({
  termGroups: {},
  activeSessions: {},
  activeRootGroup: null,

  addTab: (sessionUid) => {
    const uid = genUid()
    const group: TermGroup = {
      uid,
      sessionUid,
      parentUid: null,
      direction: null,
      sizes: null,
      children: [],
    }

    set((state) => ({
      termGroups: { ...state.termGroups, [uid]: group },
      activeSessions: { ...state.activeSessions, [uid]: sessionUid },
      activeRootGroup: uid,
    }))

    return uid
  },

  closeTab: (uid) => set((state) => {
    const group = state.termGroups[uid]
    if (!group) return state

    let termGroups = { ...state.termGroups }
    let activeSessions = { ...state.activeSessions }
    let activeRootGroup = state.activeRootGroup

    if (group.parentUid && termGroups[group.parentUid]) {
      const parent = termGroups[group.parentUid]
      const newChildren = parent.children.filter(c => c !== uid)

      if (newChildren.length === 1) {
        // Merge parent with remaining child
        const child = { ...termGroups[newChildren[0]] }

        if (parent.parentUid && termGroups[parent.parentUid]) {
          const grandParent = termGroups[parent.parentUid]
          const gpChildren = grandParent.children.map(c => c === parent.uid ? child.uid : c)
          termGroups[parent.parentUid] = { ...grandParent, children: gpChildren }
        } else {
          // Child becomes root
          activeRootGroup = child.uid
          // Preserve active session from parent's root
          const rootUid = findRootGroup(state.termGroups, parent.uid).uid
          const activeSession = state.activeSessions[rootUid]
          delete activeSessions[parent.uid]
          if (activeSession) {
            activeSessions[child.uid] = activeSession
          }
        }

        child.parentUid = parent.parentUid
        termGroups[child.uid] = child
        delete termGroups[parent.uid]
      } else {
        const newSizes = parent.sizes
          ? removalRebalance(parent.sizes, parent.children.indexOf(uid))
          : null
        termGroups[parent.uid] = { ...parent, children: newChildren, sizes: newSizes }
      }
    } else {
      // Removing a root group — find next root
      const rootGroups = Object.values(termGroups).filter(g => !g.parentUid && g.uid !== uid)
      activeRootGroup = rootGroups[0]?.uid ?? null
      // Update active session for new root so pane navigation works
      if (activeRootGroup && activeSessions[activeRootGroup]) {
        useSessionsStore.getState().setActive(activeSessions[activeRootGroup])
      }
    }

    delete termGroups[uid]
    delete activeSessions[uid]

    return { termGroups, activeSessions, activeRootGroup }
  }),

  splitVertical: (activeSessionUid, newSessionUid) => {
    get()._split(activeSessionUid, newSessionUid, 'VERTICAL')
  },

  splitHorizontal: (activeSessionUid, newSessionUid) => {
    get()._split(activeSessionUid, newSessionUid, 'HORIZONTAL')
  },

  _split: (activeSessionUid: string, newSessionUid: string, direction: 'HORIZONTAL' | 'VERTICAL') => {
    set((state) => {
      const activeGroup = findGroupBySession(state.termGroups, activeSessionUid)
      if (!activeGroup) return state

      let termGroups = { ...state.termGroups }

      let parentGroup = activeGroup.parentUid
        ? termGroups[activeGroup.parentUid]
        : activeGroup

      if (!parentGroup) return state

      // If splitting in a different direction, current group becomes new parent
      if (parentGroup.direction && parentGroup.direction !== direction) {
        parentGroup = activeGroup
      }

      const newGroup: TermGroup = {
        uid: genUid(),
        sessionUid: newSessionUid,
        parentUid: parentGroup.uid,
        direction: null,
        sizes: null,
        children: [],
      }

      termGroups[newGroup.uid] = newGroup

      if (parentGroup.sessionUid) {
        // Parent has a session — create wrapper for existing session
        const existingGroup: TermGroup = {
          uid: genUid(),
          sessionUid: parentGroup.sessionUid,
          parentUid: parentGroup.uid,
          direction: null,
          sizes: null,
          children: [],
        }

        termGroups[existingGroup.uid] = existingGroup
        termGroups[parentGroup.uid] = {
          ...parentGroup,
          sessionUid: null,
          direction,
          children: [existingGroup.uid, newGroup.uid],
          sizes: [0.5, 0.5],
        }
      } else {
        const index = parentGroup.children.indexOf(activeGroup.uid) + 1
        const newChildren = [
          ...parentGroup.children.slice(0, index),
          newGroup.uid,
          ...parentGroup.children.slice(index),
        ]

        const newSizes = parentGroup.sizes
          ? insertRebalance(parentGroup.sizes, index)
          : null

        termGroups[parentGroup.uid] = {
          ...parentGroup,
          direction,
          children: newChildren,
          sizes: newSizes,
        }
      }

      // Update active session for root
      const rootGroup = findRootGroup(termGroups, newGroup.uid)
      const activeSessions = { ...state.activeSessions, [rootGroup.uid]: newSessionUid }

      return { termGroups, activeSessions, activeRootGroup: rootGroup.uid }
    })
  },

  setActiveSession: (sessionUid) => set((state) => {
    const group = findGroupBySession(state.termGroups, sessionUid)
    if (!group) return state

    const root = findRootGroup(state.termGroups, group.uid)
    return {
      activeRootGroup: root.uid,
      activeSessions: { ...state.activeSessions, [root.uid]: sessionUid },
    }
  }),

  activateNextTab: () => set((state) => {
    const roots = Object.values(state.termGroups).filter(g => !g.parentUid).sort((a, b) => a.uid.localeCompare(b.uid))
    if (roots.length <= 1) return state

    const idx = roots.findIndex(g => g.uid === state.activeRootGroup)
    const next = roots[(idx + 1) % roots.length]
    const sessionUid = state.activeSessions[next.uid]

    if (sessionUid) {
      useSessionsStore.getState().setActive(sessionUid)
    }

    return { activeRootGroup: next.uid }
  }),

  activatePrevTab: () => set((state) => {
    const roots = Object.values(state.termGroups).filter(g => !g.parentUid).sort((a, b) => a.uid.localeCompare(b.uid))
    if (roots.length <= 1) return state

    const idx = roots.findIndex(g => g.uid === state.activeRootGroup)
    const prev = roots[(idx - 1 + roots.length) % roots.length]
    const sessionUid = state.activeSessions[prev.uid]

    if (sessionUid) {
      useSessionsStore.getState().setActive(sessionUid)
    }

    return { activeRootGroup: prev.uid }
  }),

  activateTab: (index) => set((state) => {
    const roots = Object.values(state.termGroups).filter(g => !g.parentUid).sort((a, b) => a.uid.localeCompare(b.uid))
    const target = index === -1 ? roots[roots.length - 1] : roots[index]
    if (!target) return state

    const sessionUid = state.activeSessions[target.uid]
    if (sessionUid) {
      useSessionsStore.getState().setActive(sessionUid)
    }

    return { activeRootGroup: target.uid }
  }),

  activateNextPane: () => {
    const state = get()
    if (!state.activeRootGroup) return

    const leafSessions = collectLeafSessions(state.termGroups, state.activeRootGroup)
    if (leafSessions.length <= 1) return

    const activeUid = useSessionsStore.getState().activeUid
    const idx = leafSessions.indexOf(activeUid ?? '')
    const nextIdx = (idx + 1) % leafSessions.length
    const nextUid = leafSessions[nextIdx]

    useSessionsStore.getState().setActive(nextUid)
    set((s) => ({
      activeSessions: { ...s.activeSessions, [state.activeRootGroup!]: nextUid },
    }))
  },

  activatePrevPane: () => {
    const state = get()
    if (!state.activeRootGroup) return

    const leafSessions = collectLeafSessions(state.termGroups, state.activeRootGroup)
    if (leafSessions.length <= 1) return

    const activeUid = useSessionsStore.getState().activeUid
    const idx = leafSessions.indexOf(activeUid ?? '')
    const prevIdx = (idx - 1 + leafSessions.length) % leafSessions.length
    const prevUid = leafSessions[prevIdx]

    useSessionsStore.getState().setActive(prevUid)
    set((s) => ({
      activeSessions: { ...s.activeSessions, [state.activeRootGroup!]: prevUid },
    }))
  },

  resizePane: (uid, sizes) => set((state) => {
    if (sizes.some(s => s < MIN_SIZE)) return state
    const group = state.termGroups[uid]
    if (!group) return state

    return {
      termGroups: { ...state.termGroups, [uid]: { ...group, sizes } },
    }
  }),

  getRootGroups: () => {
    const { termGroups } = get()
    return Object.values(termGroups).filter(g => !g.parentUid).sort((a, b) => a.uid.localeCompare(b.uid))
  },

  getActiveRootGroup: () => {
    const { termGroups, activeRootGroup } = get()
    return activeRootGroup ? termGroups[activeRootGroup] ?? null : null
  },
}))
