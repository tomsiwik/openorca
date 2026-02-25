/**
 * Root app component — Orca-style layout with border, tabs, terminal area.
 */
import { useEffect, useRef, useState, useMemo } from 'react'
import { AppSidebar } from './components/sidebar/app-sidebar'
import { TermGroupRenderer } from './components/term-group'
import { SettingsView } from './components/settings-view'
import { Notifications } from './components/notifications'
import { useConfigStore, useUIStore, useThemeStore, useTermGroupsStore } from './stores'
import { executeCommand, createNewTab } from './keybindings'
import { ptyConnectionManager } from './services/pty-connection'
import { useGlobalHotkeys } from './hooks/use-global-hotkeys'
import { cn } from './lib/utils'

export function App() {
  const [ready, setReady] = useState(false)
  const activeRootGroup = useTermGroupsStore((s) => s.activeRootGroup)
  const termGroups = useTermGroupsStore((s) => s.termGroups)
  const rootGroupUids = useMemo(
    () => Object.values(termGroups).filter(g => !g.parentUid).map(g => g.uid),
    [termGroups],
  )
  const isFullScreen = useUIStore((s) => s.isFullScreen)
  const isMaximized = useUIStore((s) => s.isMaximized)
  const activeView = useUIStore((s) => s.activeView)
  const borderColor = useUIStore((s) => s.borderColor)
  const cleanupRef = useRef<(() => void) | null>(null)

  // Direct keyboard shortcuts — capture phase, no IPC roundtrip
  useGlobalHotkeys()

  // Initialize on mount
  useEffect(() => {
    let cancelled = false

    const init = async () => {
      await useConfigStore.getState().loadConfig()
      const config = useConfigStore.getState().config

      if (config) {
        useUIStore.getState().applyConfig(config)
        useThemeStore.getState().applyConfigColors(config)
      }

      useThemeStore.getState().applyThemeToDOM()
      applyOrcaCSSVars()

      // StrictMode guard — don't create resources if already unmounted
      if (cancelled) return

      // Initialize connection manager with server info
      const serverInfo = await window.api.getServerInfo()
      if (serverInfo) {
        ptyConnectionManager.setServerInfo(serverInfo.url, serverInfo.token)
      }

      // Listen for commands from main process (menu clicks)
      const unsubCommands = window.api.onCommand((command) => {
        executeCommand(command)
      })

      // Listen for config changes
      const unsubConfig = window.api.onConfigChange((config) => {
        useConfigStore.getState().setConfig(config)
        useUIStore.getState().applyConfig(config)
        useThemeStore.getState().applyConfigColors(config)
        applyOrcaCSSVars()
      })

      // Listen for maximize changes
      const unsubMaximize = window.api.onMaximizeChange((maximized) => {
        useUIStore.getState().setMaximized(maximized)
      })

      // Listen for updates
      const unsubUpdate = window.api.onUpdateAvailable((info) => {
        useUIStore.getState().setUpdateVersion(info.version)
      })

      cleanupRef.current = () => {
        unsubCommands()
        unsubConfig()
        unsubMaximize()
        unsubUpdate()
      }

      // Create first tab only if not cancelled (prevents StrictMode double-create)
      await createNewTab()

      if (!cancelled) {
        setReady(true)
      }
    }

    init().catch((err) => console.error('[App] init failed:', err))

    return () => {
      cancelled = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [])


  if (!ready) {
    return (
      <div className="flex items-center justify-center w-screen h-screen bg-black text-white/30 text-sm">
        Starting...
      </div>
    )
  }

  return (
    <div
      className={cn(
        'orca-main',
        isFullScreen && 'is-fullscreen',
        isMaximized && 'is-maximized',
      )}
      style={{ borderColor }}
    >
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-hidden relative">
          {/* Terminal layers — all tabs always mounted, inactive ones hidden */}
          {rootGroupUids.length > 0 ? (
            rootGroupUids.map((uid) => (
              <div
                key={uid}
                className={cn(
                  'absolute inset-0',
                  (uid !== activeRootGroup || activeView !== 'terminal') && 'invisible',
                )}
              >
                <TermGroupRenderer groupUid={uid} />
              </div>
            ))
          ) : (
            activeView === 'terminal' && (
              <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
                No terminal open
              </div>
            )
          )}
          {/* Settings layer — mounted on top when active */}
          {activeView === 'settings' && (
            <div className="absolute inset-0">
              <SettingsView />
            </div>
          )}
        </main>
      </div>
      <Notifications />
    </div>
  )
}

/**
 * Sync Orca config colors into CSS custom properties for the border/background.
 */
function applyOrcaCSSVars() {
  const ui = useUIStore.getState()
  const root = document.documentElement.style
  root.setProperty('--orca-border-color', ui.borderColor)
  root.setProperty('--orca-background-color', ui.backgroundColor)
  root.setProperty('--orca-foreground-color', ui.foregroundColor)
}
