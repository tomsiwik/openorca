/**
 * Custom scrollbar for terminal — ported from openelk.
 * Uses imperative scroll API (no DOM scroll container).
 */
import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import { cn } from 'renderer/lib/utils'

const HIDE_DELAY = 800
const FADE_MS = 200
const MIN_THUMB = 20

export interface ScrollApiHandle {
  update: () => void
}

interface ScrollApiAreaProps {
  children: React.ReactNode
  className?: string
  getScrollback: () => number
  getViewportSize: () => number
  getScrollOffset: () => number
  scrollToLine: (line: number) => void
}

export const ScrollApiArea = forwardRef<ScrollApiHandle, ScrollApiAreaProps>(
  function ScrollApiArea({ children, className, getScrollback, getViewportSize, getScrollOffset, scrollToLine }, ref) {
    const trackRef = useRef<HTMLDivElement>(null)
    const thumbRef = useRef<HTMLDivElement>(null)
    const hideTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)
    const isDragging = useRef(false)
    const dragStartY = useRef(0)
    const dragStartTop = useRef(0)

    const showScrollbar = useCallback(() => {
      const track = trackRef.current
      if (!track || getScrollback() === 0) return

      clearTimeout(hideTimeout.current)
      track.style.opacity = '1'

      hideTimeout.current = setTimeout(() => {
        if (!isDragging.current) {
          track.style.opacity = '0'
        }
      }, HIDE_DELAY)
    }, [getScrollback])

    const updateThumb = useCallback(() => {
      const track = trackRef.current
      const thumb = thumbRef.current
      if (!track || !thumb) return

      const scrollback = getScrollback()
      if (scrollback === 0) {
        track.style.opacity = '0'
        return
      }

      const rows = getViewportSize()
      const total = scrollback + rows
      const trackH = track.clientHeight
      const thumbH = Math.max(MIN_THUMB, (rows / total) * trackH)
      const scrollFraction = getScrollOffset() / scrollback
      const thumbTop = (1 - scrollFraction) * (trackH - thumbH)

      thumb.style.height = `${thumbH}px`
      thumb.style.top = `${thumbTop}px`
    }, [getScrollback, getViewportSize, getScrollOffset])

    useImperativeHandle(ref, () => ({
      update() {
        updateThumb()
        showScrollbar()
      },
    }), [updateThumb, showScrollbar])

    useEffect(() => {
      const track = trackRef.current
      const thumb = thumbRef.current
      if (!track || !thumb) return

      const onThumbMouseDown = (e: MouseEvent) => {
        e.preventDefault()
        isDragging.current = true
        dragStartY.current = e.clientY
        dragStartTop.current = parseFloat(thumb.style.top || '0')
        clearTimeout(hideTimeout.current)
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
      }

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging.current) return
        const dy = e.clientY - dragStartY.current
        const trackH = track.clientHeight
        const thumbH = thumb.clientHeight
        const maxTop = trackH - thumbH
        const newTop = Math.max(0, Math.min(maxTop, dragStartTop.current + dy))

        const scrollback = getScrollback()
        const scrollFraction = 1 - newTop / maxTop
        scrollToLine(Math.round(scrollFraction * scrollback))
      }

      const onMouseUp = () => {
        isDragging.current = false
        showScrollbar()
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      const onTrackClick = (e: MouseEvent) => {
        if (e.target === thumb) return
        const rect = track.getBoundingClientRect()
        const clickY = e.clientY - rect.top
        const scrollback = getScrollback()
        const scrollFraction = 1 - clickY / rect.height
        scrollToLine(Math.round(scrollFraction * scrollback))
      }

      thumb.addEventListener('mousedown', onThumbMouseDown)
      track.addEventListener('mousedown', onTrackClick)

      return () => {
        thumb.removeEventListener('mousedown', onThumbMouseDown)
        track.removeEventListener('mousedown', onTrackClick)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        clearTimeout(hideTimeout.current)
      }
    }, [getScrollback, scrollToLine, showScrollbar])

    return (
      <div className={cn('relative', className)}>
        {children}
        <div
          ref={trackRef}
          className="absolute top-1 right-0 bottom-1 z-20 flex touch-none select-none p-px transition-colors w-1 border-l border-l-transparent pointer-events-auto"
          style={{ opacity: 0, transition: `opacity ${FADE_MS}ms` }}
        >
          <div
            ref={thumbRef}
            className="absolute bg-white/20 hover:bg-white/30 rounded-full cursor-pointer"
            style={{ width: 4, right: 0, minHeight: MIN_THUMB }}
          />
        </div>
      </div>
    )
  },
)
