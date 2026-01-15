import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { db } from "@/lib/db/client";
import * as authSchema from "@/schemas/auth";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { sendMagicLinkEmail } from "@/lib/effects/emails";

/**
 * Better Auth configuration with magic link authentication.
 * Uses Drizzle adapter for PostgreSQL storage.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {},
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Security: Only send magic links to users already in the database
        const existingUser = await db.query.user.findFirst({
          where: eq(authSchema.user.email, email),
        });

        if (!existingUser) {
          // Don't send email, but don't reveal user doesn't exist
          // Just log in development for debugging
          if (process.env.NODE_ENV === "development") {
            console.log("⚠️  Magic link requested for non-existent user:", email);
            console.log("💡 No email sent (user not in database)");
          }
          return;
        }

        // User exists - send the magic link
        if (process.env.NODE_ENV === "development") {
          console.log("🔮 Magic link for", email);
          console.log("🔗 URL:", url);
        }

        // Send email via Resend
        try {
          await Effect.runPromise(sendMagicLinkEmail({ email, url }));
          if (process.env.NODE_ENV === "development") {
            console.log("✅ Magic link email sent successfully");
          }
        } catch (error) {
          console.error("❌ Failed to send magic link email:", error);
          // In production, you might want to log to monitoring service
        }
      },
    }),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
})
