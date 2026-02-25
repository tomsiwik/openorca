/**
 * Window control buttons (minimize/maximize/close) for Windows/Linux.
 * On macOS, native traffic lights are used instead.
 */

interface WindowControlsProps {
  position?: 'right' | 'left'
}

export function WindowControls({ position = 'right' }: WindowControlsProps) {
  if (window.api.platform === 'darwin') return null

  return (
    <div className={`flex items-center no-drag ${position === 'left' ? 'order-first mr-2' : 'ml-auto'}`}>
      <button
        className="w-11 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"
        onClick={() => window.api.minimize()}
        aria-label="Minimize"
      >
        <svg width="10" height="1" viewBox="0 0 10 1">
          <rect fill="currentColor" width="10" height="1" />
        </svg>
      </button>
      <button
        className="w-11 h-8 flex items-center justify-center hover:bg-white/10 transition-colors"
        onClick={() => window.api.maximize()}
        aria-label="Maximize"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <rect fill="none" stroke="currentColor" width="9" height="9" x="0.5" y="0.5" />
        </svg>
      </button>
      <button
        className="w-11 h-8 flex items-center justify-center hover:bg-red-500 transition-colors"
        onClick={() => window.api.close()}
        aria-label="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path fill="currentColor" d="M1 0L0 1l4 4-4 4 1 1 4-4 4 4 1-1-4-4 4-4-1-1-4 4z" />
        </svg>
      </button>
    </div>
  )
}
