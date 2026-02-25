/**
 * Single tab — Orca-style with border, active/inactive states.
 * Height: 34px. Active tab has no bottom border. Inactive has bottom border.
 */
import { cn } from 'renderer/lib/utils'

interface TabProps {
  uid: string
  title: string
  isActive: boolean
  isFirst: boolean
  borderColor: string
  onClick: () => void
  onClose: () => void
}

export function Tab({ uid, title, isActive, isFirst, borderColor, onClick, onClose }: TabProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-1.5 px-3 h-full min-w-[100px] max-w-[200px] cursor-pointer relative',
        isActive ? 'text-white' : 'text-[#ccc] hover:text-white',
      )}
      style={{
        borderLeft: isFirst ? 'none' : `1px solid ${borderColor}`,
        borderBottom: isActive ? 'none' : `1px solid ${borderColor}`,
      }}
      onClick={onClick}
      onMouseDown={(e) => {
        // Middle-click to close
        if (e.button === 1) {
          e.preventDefault()
          onClose()
        }
      }}
    >
      <span className="flex-1 truncate text-xs font-medium">{title || 'Shell'}</span>
      <button
        className={cn(
          'w-4 h-4 flex items-center justify-center rounded-sm shrink-0',
          'opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-opacity',
        )}
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        aria-label="Close tab"
      >
        <svg width="8" height="8" viewBox="0 0 8 8">
          <path fill="currentColor" d="M1 0L0 1l3 3-3 3 1 1 3-3 3 3 1-1-3-3 3-3-1-1-3 3z" />
        </svg>
      </button>
    </div>
  )
}
