"use client"

import { AsciiFire } from "@/components/ascii-fire"
import { useFireIntensity } from "@/lib/contexts/fire-intensity-context"

/**
 * Fire background that consumes fire intensity from context.
 * Wraps AsciiFire with dynamic intensity based on running tasks.
 */
export function FireBackground() {
  const { intensity } = useFireIntensity()
  return <AsciiFire intensity={intensity} />
}
