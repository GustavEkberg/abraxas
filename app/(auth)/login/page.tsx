"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";

/**
 * Login page with magic link authentication.
 * Mystical dark theme with minimalist design.
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      await signIn.magicLink(
        { email },
        {
          onSuccess: () => {
            setIsSubmitted(true);
          },
          onError: (ctx) => {
            setError(ctx.error);
          },
        }
      );
    } finally {
      setIsPending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <div className="mb-4 text-4xl">✉️</div>
        <h1 className="mb-4 text-2xl font-semibold text-foreground">
          Check your email
        </h1>
        <p className="mb-6 text-muted-foreground">
          We&apos;ve sent a magic link to <strong className="text-foreground">{email}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Click the link in the email to sign in. The link will expire in 10 minutes.
        </p>
        <button
          onClick={() => setIsSubmitted(false)}
          className="mt-6 text-sm text-primary transition-colors hover:text-primary/80"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-8">
      <div className="mb-6 text-center">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Abraxas</h1>
        <p className="text-muted-foreground">Enter the realm</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-muted-foreground">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-md border border-input bg-background px-4 py-3 text-foreground placeholder-muted-foreground transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {error.message || "Something went wrong. Please try again."}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !email}
          className="w-full rounded-md bg-primary px-4 py-3 font-medium text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Sending magic link..." : "Send magic link"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By signing in, you summon the ancient powers of unholy execution
      </p>
    </div>
  );
}
