"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"
import { CreateRitualDialog } from "@/components/rituals/create-ritual-dialog"
import { Card } from "@/components/ui/card"

interface Ritual {
  id: string
  name: string
  description: string | null
  repositoryPath: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Rituals list page (main dashboard).
 * Displays all rituals (projects) for the authenticated user.
 */
export default function RitualsPage() {
  const router = useRouter()
  const [rituals, setRituals] = useState<Ritual[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRituals()
  }, [])

  const fetchRituals = async () => {
    try {
      const response = await fetch("/api/rituals")
      if (response.ok) {
        const data = await response.json()
        setRituals(data)
      }
    } catch (error) {
      console.error("Failed to fetch rituals:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white/90">
              The Ritual Chamber
            </h1>
            <p className="mt-2 text-white/60">
              Your bound repositories await the summons
            </p>
          </div>
          <div className="flex items-center gap-4">
            <CreateRitualDialog />
            <button
              onClick={handleSignOut}
              className="border border-dashed border-white/20 px-4 py-2 text-sm text-white/60 transition-all duration-200 hover:border-white/30 hover:text-white/90 font-mono"
            >
              Dispel Session
            </button>
          </div>
        </div>

        {/* Rituals Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-white/40">Consulting the spirits...</div>
          </div>
        ) : rituals.length === 0 ? (
          <div className="border border-dashed border-white/20 bg-zinc-950 p-12 text-center font-mono">
            <p className="mb-4 text-lg text-white/60">The void is empty</p>
            <p className="mb-8 text-sm text-white/40">
              No rituals have been summoned yet
            </p>
            <CreateRitualDialog
              trigger={
                <button className="border border-dashed border-purple-500 bg-purple-600 px-6 py-3 font-medium text-white transition-all duration-200 hover:bg-purple-700 active:scale-95 font-mono">
                  Summon Your First Ritual
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rituals.map((ritual) => (
              <Card
                key={ritual.id}
                className="group cursor-pointer border-dashed border-white/20 bg-zinc-950 p-6 transition-all duration-200 hover:border-purple-500/30 hover:bg-zinc-900 font-mono"
                onClick={() => router.push(`/rituals/${ritual.id}`)}
              >
                <h3 className="mb-2 text-xl font-semibold text-white/90 transition-colors group-hover:text-purple-400">
                  {ritual.name}
                </h3>
                {ritual.description && (
                  <p className="mb-4 line-clamp-2 text-sm text-white/60">
                    {ritual.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="text-xs text-white/40">
                    {ritual.repositoryPath.split("/").pop()}
                  </div>
                  <div className="text-xs text-white/40">
                    {new Date(ritual.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
