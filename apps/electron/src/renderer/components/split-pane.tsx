/**
 * Resizable split pane — horizontal or vertical.
 */
import { useRef, useCallback, useEffect, type ReactNode } from 'react'
import { cn } from 'renderer/lib/utils'

interface SplitPaneProps {
  direction: 'HORIZONTAL' | 'VERTICAL'
  sizes: number[]
  children: ReactNode[]
  onResize: (sizes: number[]) => void
  borderColor?: string
}

export function SplitPane({ direction, sizes, children, onResize, borderColor = '#333' }: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const isHorizontal = direction === 'HORIZONTAL'
  const actualSizes = sizes.length === children.length
    ? sizes
    : children.map(() => 1 / children.length)

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault()
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const totalSize = isHorizontal ? rect.height : rect.width
    const startPos = isHorizontal ? e.clientY : e.clientX
    const startSizes = [...actualSizes]

    const onMouseMove = (ev: MouseEvent) => {
      const pos = isHorizontal ? ev.clientY : ev.clientX
      const delta = (pos - startPos) / totalSize

      const newSizes = [...startSizes]
      const combined = startSizes[index] + startSizes[index + 1]
      newSizes[index] = Math.max(0.05, Math.min(combined - 0.05, startSizes[index] + delta))
      newSizes[index + 1] = combined - newSizes[index]

      onResize(newSizes)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [isHorizontal, actualSizes, onResize])

  return (
    <div
      ref={containerRef}
      className={cn('flex w-full h-full', isHorizontal ? 'flex-col' : 'flex-row')}
    >
      {children.map((child, i) => (
        <div key={i} className="flex" style={{ flex: `0 0 ${actualSizes[i] * 100}%` }}>
          <div className="flex-1 overflow-hidden">{child}</div>
          {i < children.length - 1 && (
            <div
              className={cn(
                'shrink-0 z-10 relative group',
                isHorizontal
                  ? 'h-px w-full cursor-row-resize'
                  : 'w-px h-full cursor-col-resize',
              )}
              style={{ backgroundColor: borderColor }}
              onMouseDown={(e) => handleMouseDown(i, e)}
              onDoubleClick={() => {
                // Double-click to equalize sizes
                const equal = children.map(() => 1 / children.length)
                onResize(equal)
              }}
            >
              {/* Wider invisible hit target */}
              <div
                className={cn(
                  'absolute',
                  isHorizontal
                    ? '-top-2 -bottom-2 left-0 right-0 cursor-row-resize'
                    : '-left-2 -right-2 top-0 bottom-0 cursor-col-resize',
                )}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
