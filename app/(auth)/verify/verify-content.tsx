"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { authClient } from "@/lib/auth-client"

/**
 * Client component that handles magic link verification.
 * Separated to allow Suspense boundary wrapping for useSearchParams().
 */
export default function VerifyContent() {
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
          router.push("/")
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
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mb-4 text-4xl">🔮</div>
        <h1 className="mb-4 text-2xl font-semibold text-foreground">
          Verifying...
        </h1>
        <p className="text-muted-foreground">
          Summoning your session from the abyss
        </p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mb-4 text-4xl">✨</div>
        <h1 className="mb-4 text-2xl font-semibold text-foreground">
          Welcome to Abraxas
        </h1>
        <p className="text-muted-foreground">
          Redirecting you to the realm...
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-destructive/20 bg-card p-8 text-center">
      <div className="mb-4 text-4xl">⚠️</div>
      <h1 className="mb-4 text-2xl font-semibold text-foreground">
        Verification Failed
      </h1>
      <p className="mb-6 text-muted-foreground">{errorMessage}</p>
      <button
        onClick={() => router.push("/login")}
        className="rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
      >
        Back to login
      </button>
    </div>
  )
}
