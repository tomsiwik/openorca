/**
 * Separator — thin divider line.
 */
import * as React from 'react'
import { cn } from 'renderer/lib/utils'

interface SeparatorProps extends React.ComponentProps<'div'> {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

export function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: SeparatorProps) {
  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={!decorative ? orientation : undefined}
      data-slot="separator"
      className={cn(
        'bg-border shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}
