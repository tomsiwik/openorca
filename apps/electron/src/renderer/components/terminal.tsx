/**
 * Terminal component — renders a single ghostty-web terminal instance.
 * Subscribes to a PtyConnection managed by PtyConnectionManager;
 * does NOT own the WebSocket or control connection lifetime.
 */
import { useEffect, useRef, useState } from 'react'
import { Ghostty, Terminal as GhosttyTerminal } from 'ghostty-web'
import { useUIStore, useThemeStore, useSessionsStore, useTermGroupsStore } from '../stores'
import { ptyConnectionManager } from '../services/pty-connection'
import { ScrollApiArea, type ScrollApiHandle } from './ui/scroll-api-area'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from './ui/context-menu'
import type { TerminalColors } from '../themes/types'

/** Trigger the background flash pseudoelement (openelk style). */
function triggerFlash() {
  const el = document.documentElement
  el.classList.remove('window-flash')
  void el.offsetWidth // force reflow to restart animation
  el.classList.add('window-flash')
}

function toITheme(colors: TerminalColors) {
  return {
    background: colors.background,
    foreground: colors.foreground,
    cursor: colors.cursor,
    cursorAccent: colors.cursorAccent,
    selectionBackground: colors.selectionBackground,
    selectionForeground: colors.selectionForeground,
    black: colors.black,
    red: colors.red,
    green: colors.green,
    yellow: colors.yellow,
    blue: colors.blue,
    magenta: colors.magenta,
    cyan: colors.cyan,
    white: colors.white,
    brightBlack: colors.brightBlack,
    brightRed: colors.brightRed,
    brightGreen: colors.brightGreen,
    brightYellow: colors.brightYellow,
    brightBlue: colors.brightBlue,
    brightMagenta: colors.brightMagenta,
    brightCyan: colors.brightCyan,
    brightWhite: colors.brightWhite,
  }
}

const CURSOR_SHAPE_MAP: Record<string, 'block' | 'underline' | 'bar'> = {
  BLOCK: 'block',
  UNDERLINE: 'underline',
  BEAM: 'bar',
}

// Start WASM load immediately at module eval time — don't wait for Terminal mount.
// This runs in parallel with React mount, config load, and tab creation.
let ghosttyPromise: Promise<Awaited<ReturnType<typeof Ghostty.load>>> | null = null

function getGhostty() {
  if (!ghosttyPromise) {
    ghosttyPromise = Ghostty.load('/ghostty-vt.wasm')
  }
  return ghosttyPromise
}

// Fire immediately — the WASM fetch + compile runs while React is still mounting
getGhostty()

interface TerminalProps {
  sessionUid: string
  ptyName: string
  isActive?: boolean
  onTitle?: (title: string) => void
  onData?: () => void
  onBell?: () => void
}

export function Terminal({ sessionUid, ptyName, isActive, onTitle, onData, onBell }: TerminalProps) {
  const outerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<GhosttyTerminal | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const scrollApiRef = useRef<ScrollApiHandle>(null)
  const cellFitRef = useRef<(() => void) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const padding = useUIStore((s) => s.padding)
  const effectiveFontSize = useUIStore((s) => s.fontSize)
  const activeView = useUIStore((s) => s.activeView)
  const focusEpoch = useSessionsStore((s) => s.focusEpoch)

  useEffect(() => {
    const outer = outerRef.current
    const container = containerRef.current
    if (!outer || !container) return

    let disposed = false

    const setup = async () => {
      const ghostty = await getGhostty()

      if (disposed) return

      const conn = ptyConnectionManager.get(ptyName)
      if (!conn) {
        throw new Error(`No connection for PTY: ${ptyName}`)
      }

      const termColors = useThemeStore.getState().getTerminalColors()
      const cursorShape = CURSOR_SHAPE_MAP[useUIStore.getState().cursorShape] ?? 'block'
      const fontSize = useUIStore.getState().fontSize
      const fontFamily = useUIStore.getState().fontFamily

      container.innerHTML = ''

      const term = new GhosttyTerminal({
        ghostty,
        cursorBlink: useUIStore.getState().cursorBlink,
        cursorStyle: cursorShape,
        fontSize,
        fontFamily,
        theme: toITheme(termColors),
      })

      term.open(container)
      termRef.current = term

      // Disable built-in scrollbar
      const renderer = (term as any).renderer
      if (renderer) {
        renderer.renderScrollbar = () => {}
      }

      let lastCols = term.cols
      let lastRows = term.rows
      let resizePending = false

      const cellFit = () => {
        const r = (term as any).renderer
        if (!r || typeof r.getMetrics !== 'function') return
        const m = r.getMetrics()
        if (!m || m.width <= 0 || m.height <= 0) return

        const w = container.clientWidth
        const h = container.clientHeight
        if (w <= 0 || h <= 0) return

        const cols = Math.max(2, Math.floor(w / m.width))
        const rows = Math.max(1, Math.floor(h / m.height))

        if (cols !== lastCols || rows !== lastRows) {
          lastCols = cols
          lastRows = rows
          term.resize(cols, rows)
          useUIStore.getState().showResizeNotification(cols, rows)
        }
        resizePending = false
      }

      cellFitRef.current = cellFit
      cellFit()

      let mouseDown = false
      const onMouseDown = () => { mouseDown = true }
      const onMouseUp = () => {
        mouseDown = false
        if (resizePending) cellFit()
      }
      document.addEventListener('mousedown', onMouseDown)
      document.addEventListener('mouseup', onMouseUp)

      const resizeObserver = new ResizeObserver(() => {
        if (mouseDown) {
          resizePending = true
        } else {
          cellFit()
        }
      })
      resizeObserver.observe(outer)

      // Scroll events
      term.onScroll(() => {
        scrollApiRef.current?.update()
      })

      // Keyboard: let Cmd+C/V/A through to system, catch everything else
      const terminalPassthrough = new Set(['KeyC', 'KeyV', 'KeyA'])
      term.attachCustomKeyEventHandler((e: KeyboardEvent) => {
        if (!e.metaKey && !e.ctrlKey) return false
        if (!e.shiftKey && terminalPassthrough.has(e.code)) return false

        e.preventDefault()
        return true
      })

      // ── Subscribe to PtyConnection ───────────────────────────────
      const unsub = conn.subscribe({
        onData(data) {
          term.write(data)
          onData?.()
        },
        onBell() {
          const bell = useUIStore.getState().bell
          if (bell) {
            triggerFlash()
            onBell?.()
          }
        },
        onTitle(title) {
          onTitle?.(title)
        },
      })

      // Terminal input -> connection
      term.onData((data) => conn.send(data))

      // Resize -> connection binary control frame
      term.onResize(({ cols, rows }) => conn.resize(cols, rows))

      // Title changes (OSC 2) — still from ghostty terminal itself
      term.onTitleChange((title: string) => {
        onTitle?.(title)
      })

      cleanupRef.current = () => {
        unsub()
        document.removeEventListener('mousedown', onMouseDown)
        document.removeEventListener('mouseup', onMouseUp)
        resizeObserver.disconnect()
      }

      // Trigger initial resize to sync terminal size with connection
      cellFit()

      term.focus()
    }

    setup().catch((err) => {
      console.error('[Terminal] setup failed:', err)
      setError(String(err))
    })

    return () => {
      disposed = true
      cleanupRef.current?.()
      cleanupRef.current = null
      termRef.current?.dispose()
      termRef.current = null
    }
  }, [ptyName]) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply font size changes to live terminal and refit grid
  useEffect(() => {
    const term = termRef.current
    if (!term) return
    ;(term as any).options.fontSize = effectiveFontSize
    // Refit cols/rows to container after font metrics change
    requestAnimationFrame(() => cellFitRef.current?.())
  }, [effectiveFontSize])

  // Focus management — re-focus when becoming active, returning from settings, or after tab close
  useEffect(() => {
    if (isActive && activeView === 'terminal' && termRef.current) {
      requestAnimationFrame(() => termRef.current?.focus())
    }
  }, [isActive, activeView, focusEpoch])

  // Clear buffer when session.cleared is set
  const cleared = useSessionsStore((s) => s.sessions[sessionUid]?.cleared ?? false)
  useEffect(() => {
    if (cleared && termRef.current) {
      termRef.current.clear()
      useSessionsStore.getState().setData(sessionUid)
    }
  }, [cleared, sessionUid])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 bg-black p-4">
        <pre className="text-sm whitespace-pre-wrap">Terminal error: {error}</pre>
      </div>
    )
  }

  const isMac = window.api.platform === 'darwin'
  const modLabel = isMac ? '\u2318' : 'Ctrl+'

  const handleCopy = async () => {
    const sel = termRef.current?.getSelection?.()
    if (sel) {
      await navigator.clipboard.writeText(sel)
      useUIStore.getState().showCopiedNotification()
    }
  }

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText()
    if (text) {
      ptyConnectionManager.get(ptyName)?.send(text)
    }
  }

  const handleSelectAll = () => {
    termRef.current?.selectAll?.()
  }

  const handleClear = () => {
    useSessionsStore.getState().clearActive()
  }

  const handleSearch = () => {
    if (sessionUid) {
      const sessions = useSessionsStore.getState()
      const session = sessions.sessions[sessionUid]
      sessions.setSearch(sessionUid, !session?.search)
    }
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <ScrollApiArea
          ref={scrollApiRef}
          className="flex-1 w-full h-full overflow-hidden"
          getScrollback={() => termRef.current?.getScrollbackLength() ?? 0}
          getViewportSize={() => termRef.current?.rows ?? 0}
          getScrollOffset={() => (termRef.current as any)?.viewportY ?? 0}
          scrollToLine={(line) => termRef.current?.scrollToLine(line)}
        >
          <div
            ref={outerRef}
            className="w-full h-full"
            style={{ padding }}
            onMouseDown={() => {
              if (!isActive) {
                useSessionsStore.getState().setActive(sessionUid)
                useTermGroupsStore.getState().setActiveSession(sessionUid)
              }
              // Always re-focus the terminal — focus can be lost to sidebar,
              // context menu, DevTools, or HMR without isActive changing.
              requestAnimationFrame(() => termRef.current?.focus())
            }}
          >
            <div
              ref={containerRef}
              className="w-full h-full overflow-hidden [&_textarea]:hidden"
            />
          </div>
        </ScrollApiArea>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopy}>
          Copy
          <ContextMenuShortcut>{modLabel}C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handlePaste}>
          Paste
          <ContextMenuShortcut>{modLabel}V</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSelectAll}>
          Select All
          <ContextMenuShortcut>{modLabel}A</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleClear}>
          Clear Buffer
          <ContextMenuShortcut>{modLabel}K</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleSearch}>
          Search
          <ContextMenuShortcut>{modLabel}F</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
