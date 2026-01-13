"use client"

import { useRouter } from "next/navigation"
import { signOut } from "@/lib/auth-client"

/**
 * Projects list page (placeholder).
 * This will be the main dashboard.
 */
export default function ProjectsPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white/90">Projects</h1>
            <p className="mt-2 text-white/60">
              Your mystical project boards
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white/90"
          >
            Sign out
          </button>
        </div>

        <div className="rounded-lg border border-white/10 bg-zinc-950 p-12 text-center">
          <p className="text-white/60">No projects yet. Create your first project to begin.</p>
        </div>
      </div>
    </div>
  )
}
