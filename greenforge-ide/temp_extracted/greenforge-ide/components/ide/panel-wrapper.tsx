'use client'

import React from 'react'

export function PanelWrapper({ children, className = '', scrollable = false }: { children: React.ReactNode; className?: string; scrollable?: boolean }) {
  return (
    <div 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        minHeight: 0, 
        minWidth: 0, 
        overflow: scrollable ? 'auto' : 'hidden' 
      }} 
      className={className}
    >
      {children}
    </div>
  )
}
