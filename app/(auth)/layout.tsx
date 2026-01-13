import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In - Abraxas",
  description: "Enter the realm of Abraxas",
}

/**
 * Layout for authentication pages.
 * Centered layout with mystical background.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
