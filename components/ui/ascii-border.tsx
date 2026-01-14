"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface AsciiBorderProps extends React.ComponentProps<"div"> {
  children: React.ReactNode
}

/**
 * ASCII border wrapper component.
 * Renders content with ASCII art borders using box drawing characters.
 */
export function AsciiBorder({
  children,
  className,
  ...props
}: AsciiBorderProps) {
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 })

  React.useEffect(() => {
    if (!contentRef.current) return

    const updateDimensions = () => {
      if (contentRef.current) {
        setDimensions({
          width: contentRef.current.offsetWidth,
          height: contentRef.current.offsetHeight,
        })
      }
    }

    updateDimensions()
    const observer = new ResizeObserver(updateDimensions)
    observer.observe(contentRef.current)

    return () => observer.disconnect()
  }, [])

  // Calculate how many characters fit
  const charsWide = Math.floor(dimensions.width / 8) // ~8px per char
  const charsHigh = Math.floor(dimensions.height / 16) // ~16px per line

  return (
    <div className={cn("relative font-mono", className)} {...props}>
      {/* ASCII border overlay */}
      <div className="pointer-events-none absolute inset-0 select-none text-white/20 text-xs leading-tight">
        {/* Top border */}
        <div className="absolute top-0 left-0 right-0">
          +{"-".repeat(Math.max(0, charsWide - 2))}+
        </div>
        
        {/* Side borders */}
        {Array.from({ length: Math.max(0, charsHigh - 2) }).map((_, i) => (
          <div key={i} className="absolute left-0 right-0" style={{ top: `${(i + 1) * 16}px` }}>
            |{" ".repeat(Math.max(0, charsWide - 2))}|
          </div>
        ))}
        
        {/* Bottom border */}
        <div className="absolute bottom-0 left-0 right-0">
          +{"-".repeat(Math.max(0, charsWide - 2))}+
        </div>
      </div>
      
      {/* Content */}
      <div ref={contentRef} className="relative z-10 p-4">
        {children}
      </div>
    </div>
  )
}
