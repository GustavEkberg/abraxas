"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"

/**
 * Magic link verification page.
 * Handles the callback when users click the magic link.
 */
export default function VerifyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  )
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token")

      if (!token) {
        setStatus("error")
        setErrorMessage("Invalid verification link")
        return
      }

      try {
        await authClient.magicLink.verify({
          query: { token },
        })

        setStatus("success")

        // Redirect to dashboard after successful verification
        setTimeout(() => {
          router.push("/projects")
        }, 2000)
      } catch (error) {
        setStatus("error")
        setErrorMessage(
          error instanceof Error ? error.message : "Verification failed"
        )
      }
    }

    verifyToken()
  }, [searchParams, router])

  if (status === "verifying") {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-950 p-8 text-center">
        <div className="mb-4 text-4xl">🔮</div>
        <h1 className="mb-4 text-2xl font-semibold text-white/90">
          Verifying...
        </h1>
        <p className="text-white/60">
          Summoning your session from the abyss
        </p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-950 p-8 text-center">
        <div className="mb-4 text-4xl">✨</div>
        <h1 className="mb-4 text-2xl font-semibold text-white/90">
          Welcome to Abraxas
        </h1>
        <p className="text-white/60">
          Redirecting you to the realm...
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-red-500/20 bg-zinc-950 p-8 text-center">
      <div className="mb-4 text-4xl">⚠️</div>
      <h1 className="mb-4 text-2xl font-semibold text-white/90">
        Verification Failed
      </h1>
      <p className="mb-6 text-white/60">{errorMessage}</p>
      <button
        onClick={() => router.push("/login")}
        className="rounded-md bg-purple-600 px-6 py-3 font-medium text-white transition-all hover:bg-purple-500 active:scale-95"
      >
        Back to login
      </button>
    </div>
  )
}
