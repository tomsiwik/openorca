/**
 * Single notification toast.
 */
import { cn } from 'renderer/lib/utils'

interface NotificationProps {
  text: string
  url?: string
  onDismiss: () => void
}

export function Notification({ text, url, onDismiss }: NotificationProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/10 rounded-md backdrop-blur-sm text-xs text-white/80 animate-in slide-in-from-right duration-300">
      <span className="flex-1">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
            {text}
          </a>
        ) : (
          text
        )}
      </span>
      <button
        className="w-4 h-4 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <svg width="8" height="8" viewBox="0 0 8 8">
          <path fill="currentColor" d="M1 0L0 1l3 3-3 3 1 1 3-3 3 3 1-1-3-3 3-3-1-1-3 3z" />
        </svg>
      </button>
    </div>
  )
}
