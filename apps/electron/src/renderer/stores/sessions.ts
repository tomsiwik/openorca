/**
 * PTY sessions store — ported from OpenOrca's sessions reducer to Zustand.
 */
import { create } from 'zustand'

export interface Session {
  uid: string
  title: string
  shell: string | null
  pid: number | null
  cols: number
  rows: number
  ptyName: string
  profile: string
  search: boolean
  cleared: boolean
}

interface SessionsStore {
  sessions: Record<string, Session>
  activeUid: string | null
  focusEpoch: number

  addSession: (s: Session) => void
  removeSession: (uid: string) => void
  setActive: (uid: string) => void
  requestFocus: () => void
  setTitle: (uid: string, title: string) => void
  setSearch: (uid: string, value: boolean) => void
  setCols: (uid: string, cols: number) => void
  setRows: (uid: string, rows: number) => void
  resize: (uid: string, cols: number, rows: number) => void
  clearActive: () => void
  setData: (uid: string) => void
}

export const useSessionsStore = create<SessionsStore>((set, get) => ({
  sessions: {},
  activeUid: null,
  focusEpoch: 0,

  addSession: (s) => set((state) => ({
    sessions: { ...state.sessions, [s.uid]: s },
    activeUid: s.uid,
  })),

  removeSession: (uid) => set((state) => {
    const { [uid]: _, ...rest } = state.sessions
    const activeUid = state.activeUid === uid
      ? Object.keys(rest)[0] ?? null
      : state.activeUid
    return { sessions: rest, activeUid }
  }),

  setActive: (uid) => set({ activeUid: uid }),

  requestFocus: () => set((state) => ({ focusEpoch: state.focusEpoch + 1 })),

  setTitle: (uid, title) => set((state) => {
    const session = state.sessions[uid]
    if (!session) return state
    return {
      sessions: { ...state.sessions, [uid]: { ...session, title: title.trim() } },
    }
  }),

  setSearch: (uid, value) => set((state) => {
    const session = state.sessions[uid]
    if (!session) return state
    return {
      sessions: { ...state.sessions, [uid]: { ...session, search: value } },
    }
  }),

  setCols: (uid, cols) => set((state) => {
    const session = state.sessions[uid]
    if (!session) return state
    return {
      sessions: { ...state.sessions, [uid]: { ...session, cols } },
    }
  }),

  setRows: (uid, rows) => set((state) => {
    const session = state.sessions[uid]
    if (!session) return state
    return {
      sessions: { ...state.sessions, [uid]: { ...session, rows } },
    }
  }),

  resize: (uid, cols, rows) => set((state) => {
    const session = state.sessions[uid]
    if (!session) return state
    return {
      sessions: { ...state.sessions, [uid]: { ...session, cols, rows } },
    }
  }),

  clearActive: () => set((state) => {
    if (!state.activeUid) return state
    const session = state.sessions[state.activeUid]
    if (!session) return state
    return {
      sessions: { ...state.sessions, [state.activeUid]: { ...session, cleared: true } },
    }
  }),

  setData: (uid) => set((state) => {
    const session = state.sessions[uid]
    if (!session || !session.cleared) return state
    return {
      sessions: { ...state.sessions, [uid]: { ...session, cleared: false } },
    }
  }),
}))
