"use client"

import { useState } from "react"
import { signIn } from "@/lib/auth-client"

/**
 * Login page with magic link authentication.
 * Mystical dark theme with minimalist design.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    try {
      await signIn.magicLink(
        { email },
        {
          onSuccess: () => {
            setIsSubmitted(true)
          },
          onError: (ctx) => {
            setError(ctx.error)
          },
        }
      )
    } finally {
      setIsPending(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-lg border border-white/10 bg-zinc-950 p-8 text-center">
        <div className="mb-4 text-4xl">✉️</div>
        <h1 className="mb-4 text-2xl font-semibold text-white/90">
          Check your email
        </h1>
        <p className="mb-6 text-white/60">
          We&apos;ve sent a magic link to <strong className="text-white/90">{email}</strong>
        </p>
        <p className="text-sm text-white/40">
          Click the link in the email to sign in. The link will expire in 10 minutes.
        </p>
        <button
          onClick={() => setIsSubmitted(false)}
          className="mt-6 text-sm text-purple-400 transition-colors hover:text-purple-300"
        >
          Use a different email
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950 p-8">
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-3xl font-bold text-white/90">Abraxas</h1>
        <p className="text-white/60">Enter the realm</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-white/60">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-md border border-white/10 bg-black px-4 py-3 text-white/90 placeholder-white/40 transition-colors focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>

        {error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error.message || "Something went wrong. Please try again."}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !email}
          className="w-full rounded-md bg-purple-600 px-4 py-3 font-medium text-white transition-all hover:bg-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Sending magic link..." : "Send magic link"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-white/40">
        By signing in, you summon the ancient powers of autonomous task execution
      </p>
    </div>
  )
}
