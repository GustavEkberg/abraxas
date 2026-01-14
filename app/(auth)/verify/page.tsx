import { Suspense } from "react"
import VerifyContent from "./verify-content"

/**
 * Magic link verification page.
 * Handles the callback when users click the magic link.
 */
export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <div className="mb-4 text-4xl">🔮</div>
          <h1 className="mb-4 text-2xl font-semibold text-foreground">
            Loading...
          </h1>
          <p className="text-muted-foreground">
            Preparing the verification ritual
          </p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  )
}
