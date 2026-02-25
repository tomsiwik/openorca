/**
 * Global keyboard shortcut handler — capture-phase keydown listener.
 * Modeled on openelk's direct approach: check e.code (physical key),
 * call store actions directly, no IPC roundtrip.
 */
import { useEffect } from 'react'
import { useSessionsStore, useTermGroupsStore, useUIStore } from '../stores'
import { createNewTab, splitPane, closeActivePane } from '../keybindings'

export function useGlobalHotkeys() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // ── Escape — close search if open ───────────────────────────
      if (e.code === 'Escape') {
        const sessions = useSessionsStore.getState()
        const activeUid = sessions.activeUid
        if (activeUid && sessions.sessions[activeUid]?.search) {
          e.preventDefault()
          e.stopPropagation()
          sessions.setSearch(activeUid, false)
        }
        return
      }

      if (!mod) return

      const shift = e.shiftKey
      const alt = e.altKey

      // ── Tab management ──────────────────────────────────────────
      // Cmd+T — new tab
      if (!shift && !alt && e.code === 'KeyT') {
        e.preventDefault()
        e.stopPropagation()
        createNewTab()
        return
      }

      // Cmd+W — close pane (or close settings tab if active)
      if (!shift && !alt && e.code === 'KeyW') {
        e.preventDefault()
        e.stopPropagation()
        if (useUIStore.getState().activeView === 'settings') {
          useUIStore.getState().closeSettingsTab()
          useSessionsStore.getState().requestFocus()
        } else {
          closeActivePane()
        }
        return
      }

      // Cmd+Shift+W — close window
      if (shift && !alt && e.code === 'KeyW') {
        e.preventDefault()
        e.stopPropagation()
        window.api.close()
        return
      }

      // ── Pane splitting ──────────────────────────────────────────
      // Cmd+D — split right
      if (!shift && !alt && e.code === 'KeyD') {
        e.preventDefault()
        e.stopPropagation()
        splitPane('VERTICAL')
        return
      }

      // Cmd+Shift+D — split down
      if (shift && !alt && e.code === 'KeyD') {
        e.preventDefault()
        e.stopPropagation()
        splitPane('HORIZONTAL')
        return
      }

      // ── Pane navigation ─────────────────────────────────────────
      // Cmd+] — next pane
      if (!shift && !alt && e.code === 'BracketRight') {
        e.preventDefault()
        e.stopPropagation()
        useTermGroupsStore.getState().activateNextPane()
        return
      }

      // Cmd+[ — prev pane
      if (!shift && !alt && e.code === 'BracketLeft') {
        e.preventDefault()
        e.stopPropagation()
        useTermGroupsStore.getState().activatePrevPane()
        return
      }

      // ── Tab navigation ──────────────────────────────────────────
      // Cmd+Shift+] — next tab
      if (shift && !alt && e.code === 'BracketRight') {
        e.preventDefault()
        e.stopPropagation()
        useTermGroupsStore.getState().activateNextTab()
        return
      }

      // Cmd+Shift+[ — prev tab
      if (shift && !alt && e.code === 'BracketLeft') {
        e.preventDefault()
        e.stopPropagation()
        useTermGroupsStore.getState().activatePrevTab()
        return
      }

      // Ctrl+Tab / Ctrl+Shift+Tab — next/prev tab
      if (e.ctrlKey && e.code === 'Tab') {
        e.preventDefault()
        e.stopPropagation()
        if (shift) {
          useTermGroupsStore.getState().activatePrevTab()
        } else {
          useTermGroupsStore.getState().activateNextTab()
        }
        return
      }

      // ── Zoom ────────────────────────────────────────────────────
      // Cmd+= or Cmd++ — zoom in
      if (!shift && !alt && (e.code === 'Equal')) {
        e.preventDefault()
        e.stopPropagation()
        useUIStore.getState().increaseFontSize()
        useUIStore.getState().showFontNotification()
        return
      }

      // Cmd+- — zoom out
      if (!shift && !alt && e.code === 'Minus') {
        e.preventDefault()
        e.stopPropagation()
        useUIStore.getState().decreaseFontSize()
        useUIStore.getState().showFontNotification()
        return
      }

      // Cmd+0 — zoom reset
      if (!shift && !alt && e.code === 'Digit0') {
        e.preventDefault()
        e.stopPropagation()
        useUIStore.getState().resetFontSize()
        useUIStore.getState().showFontNotification()
        return
      }

      // ── Editor ──────────────────────────────────────────────────
      // Cmd+K — clear buffer
      if (!shift && !alt && e.code === 'KeyK') {
        e.preventDefault()
        e.stopPropagation()
        useSessionsStore.getState().clearActive()
        return
      }

      // Cmd+B — toggle sidebar
      if (!shift && !alt && e.code === 'KeyB') {
        e.preventDefault()
        e.stopPropagation()
        useUIStore.getState().toggleSidebar()
        return
      }

      // Cmd+F — search
      if (!shift && !alt && e.code === 'KeyF') {
        e.preventDefault()
        e.stopPropagation()
        const sessions = useSessionsStore.getState()
        const activeUid = sessions.activeUid
        if (activeUid) {
          const session = sessions.sessions[activeUid]
          sessions.setSearch(activeUid, !session?.search)
        }
        return
      }

      // ── Window management ───────────────────────────────────────
      // Cmd+, — open settings tab
      if (!shift && !alt && e.code === 'Comma') {
        e.preventDefault()
        e.stopPropagation()
        useUIStore.getState().openSettingsTab()
        return
      }

      // Cmd+Alt+I — devtools
      if (!shift && alt && e.code === 'KeyI') {
        e.preventDefault()
        e.stopPropagation()
        window.api.devtools()
        return
      }

      // Cmd+N — new window (currently creates a tab)
      if (!shift && !alt && e.code === 'KeyN') {
        e.preventDefault()
        e.stopPropagation()
        createNewTab()
        return
      }

      // ── Tab jump Cmd+1..8 ───────────────────────────────────────
      if (!shift && !alt) {
        const digitMatch = e.code.match(/^Digit([1-8])$/)
        if (digitMatch) {
          e.preventDefault()
          e.stopPropagation()
          useTermGroupsStore.getState().activateTab(parseInt(digitMatch[1], 10) - 1)
          return
        }
        // Cmd+9 — last tab
        if (e.code === 'Digit9') {
          e.preventDefault()
          e.stopPropagation()
          useTermGroupsStore.getState().activateTab(-1)
          return
        }
      }
    }

    // Capture phase — intercept before terminal sees the key
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [])
}
