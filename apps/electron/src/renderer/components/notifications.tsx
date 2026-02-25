/**
 * Notification stack — displays toasts in bottom-right corner.
 * Includes font size and resize overlays (auto-dismiss after 1s).
 */
import { useState, useEffect } from 'react'
import { Notification } from './notification'
import { useUIStore } from '../stores'

interface NotificationItem {
  id: string
  text: string
  url?: string
}

export function Notifications() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const updateVersion = useUIStore((s) => s.updateVersion)
  const fontNotification = useUIStore((s) => s.notifications.font)
  const resizeNotification = useUIStore((s) => s.notifications.resize)
  const copiedNotification = useUIStore((s) => s.notifications.copied)
  const resizeCols = useUIStore((s) => s.resizeCols)
  const resizeRows = useUIStore((s) => s.resizeRows)
  const fontSize = useUIStore((s) => s.fontSize)

  // Listen for notifications from main process
  useEffect(() => {
    const unsub = window.api.onNotification((n) => {
      const id = `notif-${Date.now()}`
      setItems((prev) => [...prev, { id, text: n.text, url: n.url }])

      // Auto-dismiss after 8s
      setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== id))
      }, 8000)
    })

    return unsub
  }, [])

  // Update notification
  useEffect(() => {
    if (updateVersion) {
      const id = `update-${updateVersion}`
      setItems((prev) => {
        if (prev.some((item) => item.id === id)) return prev
        return [...prev, { id, text: `Update available: v${updateVersion}` }]
      })
    }
  }, [updateVersion])

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const hasOverlay = fontNotification || resizeNotification
  const hasItems = items.length > 0

  if (!hasOverlay && !hasItems && !copiedNotification) return null

  return (
    <>
      {/* Copied toast — bottom-left */}
      {copiedNotification && (
        <div className="fixed bottom-4 left-4 z-50">
          <div className="px-3 py-1.5 rounded bg-white/20 text-white text-sm font-mono backdrop-blur-sm">
            Copied
          </div>
        </div>
      )}

      {/* Other notifications — bottom-right */}
      {(hasOverlay || hasItems) && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm items-end">
          {/* Font size overlay */}
          {fontNotification && (
            <div className="px-3 py-1.5 rounded bg-white/20 text-white text-sm font-mono backdrop-blur-sm">
              {fontSize}px
            </div>
          )}

          {/* Resize overlay (cols x rows) */}
          {resizeNotification && (
            <div className="px-3 py-1.5 rounded bg-white/20 text-white text-sm font-mono backdrop-blur-sm">
              {resizeCols} x {resizeRows}
            </div>
          )}

          {/* Message notifications */}
          {items.map((item) => (
            <Notification
              key={item.id}
              text={item.text}
              url={item.url}
              onDismiss={() => dismiss(item.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}
