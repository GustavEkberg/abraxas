import { opencodeClient } from "./client";

/**
 * Check if an OpenCode session is complete.
 * 
 * A session is considered complete when:
 * - Session exists
 * - Session status is "idle" (not "busy" or "retry")
 * - Session has messages
 * - Last message is from assistant (not user)
 * 
 * @param sessionId - OpenCode session ID
 * @param directory - Repository directory path (must match the directory used when creating the session)
 */
export async function isSessionComplete(
  sessionId: string,
  directory?: string
): Promise<{
  complete: boolean;
  success: boolean;
  summary?: string;
  error?: string;
}> {
  try {
    // Get session status, session data, and messages - use same directory context as session creation
    const client = opencodeClient(directory);
    const [statusResp, sessionResp, messagesResp] = await Promise.all([
      client.session.status({ query: { directory } }),
      client.session.get({ path: { id: sessionId } }),
      client.session.messages({ path: { id: sessionId } }),
    ]);

    const sessionStatuses = statusResp.data;
    const session = sessionResp.data;
    const messages = messagesResp.data || [];

    if (!session) {
      return {
        complete: true,
        success: false,
        error: "Session not found",
      };
    }

    // Check session status - only complete if status is "idle"
    const sessionStatus = sessionStatuses?.[sessionId];
    if (!sessionStatus || sessionStatus.type !== "idle") {
      // Session is still busy or retrying
      return { complete: false, success: false };
    }

    // If no messages yet, session is not complete
    if (messages.length === 0) {
      return { complete: false, success: false };
    }

    // Get the last message
    const lastMessage = messages[messages.length - 1];

    // Check if last message is from assistant (not user)
    if (lastMessage.info.role !== "assistant") {
      return { complete: false, success: false };
    }

    // Session is complete and idle - extract summary from last message
    const textParts = lastMessage.parts.filter(part => part.type === "text");
    const summary = textParts.map(part => part.text).join("\n");

    return {
      complete: true,
      success: true,
      summary: summary || "Task execution completed",
    };
  } catch (error) {
    console.error("Failed to check session status:", error);
    return {
      complete: true,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if the session has a question that needs user input.
 * 
 * Returns the question text if found.
 * 
 * @param sessionId - OpenCode session ID
 * @param directory - Repository directory path (must match the directory used when creating the session)
 */
export async function getSessionQuestion(
  sessionId: string,
  directory?: string
): Promise<string | null> {
  try {
    const client = opencodeClient(directory);
    const messagesResp = await client.session.messages({
      path: { id: sessionId },
    });
    const messages = messagesResp.data || [];

    if (messages.length === 0) return null;

    // Get last assistant message
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.info.role !== "assistant") return null;

    // Extract text content
    const textParts = lastMessage.parts.filter(part => part.type === "text");
    const text = textParts.map(part => part.text).join("\n");

    // Simple heuristic: check if message ends with '?' or contains question indicators
    const questionIndicators = ["?", "please provide", "what is", "which", "how"];
    const hasQuestion = questionIndicators.some((indicator) =>
      text.toLowerCase().includes(indicator)
    );

    if (hasQuestion) {
      return text;
    }

    return null;
  } catch (error) {
    console.error("Failed to get session question:", error);
    return null;
  }
}

/**
 * Poll an OpenCode session until it completes.
 * 
 * @param sessionId - OpenCode session ID
 * @param onProgress - Callback for progress updates (questions, intermediate messages)
 * @param intervalMs - Polling interval in milliseconds (default: 5000)
 * @returns Completion result
 */
export async function pollSessionUntilComplete(
  sessionId: string,
  onProgress?: (question: string) => void,
  intervalMs = 5000
): Promise<{
  success: boolean;
  summary?: string;
  error?: string;
}> {
  const maxAttempts = 360; // 30 minutes with 5s interval
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Check if session is complete
    const result = await isSessionComplete(sessionId);

    if (result.complete) {
      return {
        success: result.success,
        summary: result.summary,
        error: result.error,
      };
    }

    // Check for questions
    if (onProgress) {
      const question = await getSessionQuestion(sessionId);
      if (question) {
        onProgress(question);
      }
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  // Timeout reached
  return {
    success: false,
    error: "Session polling timeout (30 minutes)",
  };
}
