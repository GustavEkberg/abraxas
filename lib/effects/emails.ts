import { Effect, Config } from "effect";
import { Resend } from "resend";

/**
 * Email sending service using Resend.
 */

// Create Resend client with API key from environment
const resendClient = Effect.gen(function* () {
  const apiKey = yield* Config.string("RESEND_API_KEY");
  return new Resend(apiKey);
});

/**
 * Send magic link email for authentication.
 */
export const sendMagicLinkEmail = (params: { email: string; url: string; }) =>
  Effect.gen(function* () {
    const { email, url } = params;
    const resend = yield* resendClient;

    const result = yield* Effect.tryPromise({
      try: () =>
        resend.emails.send({
          from: "Abraxas <onboarding@resend.dev>",
          to: email,
          subject: "Sign in to Abraxas",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #6b46c1;">Welcome to Abraxas</h1>
              <p>Click the link below to sign in to your account:</p>
              <a href="${url}" style="display: inline-block; padding: 12px 24px; background-color: #6b46c1; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Sign In
              </a>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 24 hours. If you didn't request this email, you can safely ignore it.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
              <p style="color: #999; font-size: 12px;">
                This email was sent by Abraxas. If you're having trouble clicking the button, copy and paste this URL into your browser: ${url}
              </p>
            </div>
          `,
        }),
      catch: (error) => new EmailSendError(`Failed to send magic link email: ${error}`)
    });

    return result;
  });

/**
 * Email sending error class.
 */
export class EmailSendError {
  readonly _tag = "EmailSendError";
  constructor(readonly message: string, readonly cause?: unknown) { }
}
