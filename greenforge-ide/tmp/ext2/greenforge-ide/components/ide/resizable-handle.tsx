'use client'

import React from 'react'
import { PanelResizeHandle } from 'react-resizable-panels'
import { cn } from '@/lib/utils'

export function ResizeHandle({ 
  direction = 'horizontal', 
  className 
}: { 
  direction?: 'horizontal' | 'vertical'
  className?: string 
}) {
  return (
    <PanelResizeHandle 
      className={cn(
        direction === 'horizontal' ? 'resize-handle-horizontal' : 'resize-handle-vertical',
        className
      )} 
    />
  )
}
