/**
 * Header component — simplified title bar (tabs moved to sidebar).
 * 34px height, draggable, with window controls on Win/Linux.
 */
import { WindowControls } from './window-controls'
import { useUIStore } from '../stores'

export function Header() {
  const isMac = window.api.platform === 'darwin'
  const showWindowControls = useUIStore((s) => s.showWindowControls)
  const borderColor = useUIStore((s) => s.borderColor)

  return (
    <div
      className="flex items-center h-[34px] shrink-0 select-none drag"
      style={{ borderBottom: `1px solid ${borderColor}` }}
    >
      {/* macOS: just a drag region (traffic lights are in the sidebar area) */}
      {isMac && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs text-white/60">OpenOrca</span>
        </div>
      )}

      {/* Win/Linux: window controls */}
      {!isMac && (
        <>
          {showWindowControls === 'left' && <WindowControls position="left" />}
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xs text-white/60">OpenOrca</span>
          </div>
          {showWindowControls !== 'left' && showWindowControls !== false && (
            <WindowControls position="right" />
          )}
        </>
      )}
    </div>
  )
}
