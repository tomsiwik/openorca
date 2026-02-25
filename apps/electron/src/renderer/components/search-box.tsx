/**
 * Find-in-terminal overlay — toggle with Cmd/Ctrl+F.
 */
import { useState, useRef, useEffect } from 'react'
import { cn } from 'renderer/lib/utils'

interface SearchBoxProps {
  isVisible: boolean
  onClose: () => void
}

export function SearchBox({ isVisible, onClose }: SearchBoxProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isVisible) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="absolute top-2 right-2 z-30 flex items-center gap-1 px-2 py-1 bg-black/80 border border-white/10 rounded-md backdrop-blur-sm">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onClose()
          }
          // Prevent terminal from capturing these keys
          e.stopPropagation()
        }}
        placeholder="Find..."
        className="w-48 px-2 py-0.5 bg-transparent text-white text-xs outline-none placeholder:text-white/30"
      />
      {/* Prev match */}
      <button
        className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
        aria-label="Previous match"
        tabIndex={-1}
      >
        <svg width="8" height="8" viewBox="0 0 8 8">
          <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 5.5L4 2.5L7 5.5" />
        </svg>
      </button>
      {/* Next match */}
      <button
        className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
        aria-label="Next match"
        tabIndex={-1}
      >
        <svg width="8" height="8" viewBox="0 0 8 8">
          <path fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M1 2.5L4 5.5L7 2.5" />
        </svg>
      </button>
      {/* Close */}
      <button
        className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
        onClick={onClose}
        aria-label="Close search"
      >
        <svg width="8" height="8" viewBox="0 0 8 8">
          <path fill="currentColor" d="M1 0L0 1l3 3-3 3 1 1 3-3 3 3 1-1-3-3 3-3-1-1-3 3z" />
        </svg>
      </button>
    </div>
  )
}
