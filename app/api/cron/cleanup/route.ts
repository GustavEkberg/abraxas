import { NextRequest, NextResponse } from "next/server"
import { runCleanup } from "@/lib/sprites/cleanup"

/**
 * GET /api/cron/cleanup
 * 
 * Cleanup stale sprite sessions.
 * This endpoint is designed to be called by a cron job (e.g., Vercel Cron).
 * 
 * For security, you can add a secret check via CRON_SECRET env var.
 */
export async function GET(request: NextRequest) {
  // Optional: Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  console.log("[Cron] Starting sprite cleanup...")

  const result = await runCleanup()

  console.log(`[Cron] Cleanup complete. Cleaned ${result.cleaned} sessions.`)

  return NextResponse.json({
    success: true,
    cleaned: result.cleaned,
    timestamp: new Date().toISOString(),
  })
}
