import { opencodeClient } from "./client";

/**
 * Session completion result.
 */
export interface SessionCompletionResult {
  success: boolean;
  summary?: string;
  error?: string;
  messageCount?: number;
  inputTokens?: number;
  outputTokens?: number;
}

/**
 * Progress event types for session monitoring.
 */
export type SessionProgressEvent =
  | { type: "status"; status: "idle" | "busy" | "retry"; retryInfo?: { attempt: number; message: string; next: number } }
  | { type: "question"; question: string }
  | { type: "message"; message: string }
  | { type: "stats"; messageCount: number; inputTokens: number; outputTokens: number }
  | { type: "error"; error: string }
  | { type: "complete"; result: SessionCompletionResult };

/**
 * Monitor an OpenCode session using the event stream API.
 * 
 * Subscribes to real-time events from the OpenCode server and monitors
 * session status, messages, and errors. Returns when the session completes
 * or errors occur.
 * 
 * @param sessionId - OpenCode session ID to monitor
 * @param directory - Repository directory path (must match the directory used when creating the session)
 * @param onProgress - Callback for progress updates (status changes, questions, messages)
 * @param timeoutMs - Maximum time to wait for completion (default: 30 minutes)
 * @returns Completion result with success status, summary, or error
 */
export async function monitorSession(
  sessionId: string,
  directory: string | undefined,
  onProgress?: (event: SessionProgressEvent) => void,
  timeoutMs = 30 * 60 * 1000 // 30 minutes
): Promise<SessionCompletionResult> {
  const client = opencodeClient(directory);
  
  // Set up timeout
  const timeoutPromise = new Promise<SessionCompletionResult>((resolve) => {
    setTimeout(() => {
      resolve({
        success: false,
        error: "Session monitoring timeout (30 minutes)",
      });
    }, timeoutMs);
  });

  // Monitor events
  const monitorPromise = (async (): Promise<SessionCompletionResult> => {
    try {
      // Subscribe to events
      console.log(`[session-monitor] Subscribing to events for session ${sessionId} in directory ${directory}`);
      const stream = await client.event.subscribe({ query: { directory } });

      // Track session state
      let hasMessages = false;
      let lastMessageRole: "user" | "assistant" | undefined;
      let lastMessageText = "";
      let eventCount = 0;
      const seenMessageIds = new Set<string>();  // Track unique messages
      const messageTokens = new Map<string, { input: number; output: number }>();  // Track tokens per message

      for await (const event of stream.stream) {
        eventCount++;
        if (eventCount % 10 === 0) {
          console.log(`[session-monitor] Processed ${eventCount} events for session ${sessionId}`);
        }
        // Only process events for our target session
        let eventSessionId: string | undefined;
        
        if ("sessionID" in event.properties && typeof event.properties.sessionID === "string") {
          eventSessionId = event.properties.sessionID;
        } else if (
          "info" in event.properties &&
          event.properties.info &&
          typeof event.properties.info === "object" &&
          "sessionID" in event.properties.info &&
          typeof event.properties.info.sessionID === "string"
        ) {
          eventSessionId = event.properties.info.sessionID;
        }

        // Skip events that don't belong to our session
        // If eventSessionId is undefined, skip it (we can't determine which session it's for)
        if (!eventSessionId || eventSessionId !== sessionId) {
          continue;
        }

        console.log(`[session-monitor] Event for session ${sessionId}: ${event.type}`);

        // Handle different event types
        switch (event.type) {
          case "session.status": {
            if ("status" in event.properties && typeof event.properties.status === "object" && event.properties.status !== null) {
              const status = event.properties.status as { type: string; attempt?: number; message?: string; next?: number };
              
              if (status.type === "idle") {
                console.log(`[session-monitor] Session ${sessionId} is idle. hasMessages=${hasMessages}, lastMessageRole=${lastMessageRole}`);
                onProgress?.({ type: "status", status: "idle" });

                // Session is idle - check if it's complete
                if (hasMessages && lastMessageRole === "assistant") {
                  console.log(`[session-monitor] Session ${sessionId} completed successfully`);

                  // Calculate total tokens across all messages
                  let totalInputTokens = 0;
                  let totalOutputTokens = 0;
                  for (const tokens of messageTokens.values()) {
                    totalInputTokens += tokens.input || 0;
                    totalOutputTokens += tokens.output || 0;
                  }

                  return {
                    success: true,
                    summary: lastMessageText || "Task execution completed",
                    messageCount: seenMessageIds.size,
                    inputTokens: totalInputTokens,
                    outputTokens: totalOutputTokens,
                  };
                }
              } else if (status.type === "busy") {
                console.log(`[session-monitor] Session ${sessionId} is busy`);
                onProgress?.({ type: "status", status: "busy" });
              } else if (status.type === "retry" && typeof status.attempt === "number" && typeof status.message === "string" && typeof status.next === "number") {
                onProgress?.({
                  type: "status",
                  status: "retry",
                  retryInfo: {
                    attempt: status.attempt,
                    message: status.message,
                    next: status.next,
                  },
                });
              }
            }
            break;
          }

          case "session.idle": {
            console.log(`[session-monitor] Session ${sessionId} idle event. hasMessages=${hasMessages}, lastMessageRole=${lastMessageRole}`);
            // Session became idle - final check for completion
            if (hasMessages && lastMessageRole === "assistant") {
              console.log(`[session-monitor] Session ${sessionId} completed via idle event`);

              // Calculate total tokens across all messages
              let totalInputTokens = 0;
              let totalOutputTokens = 0;
              for (const tokens of messageTokens.values()) {
                totalInputTokens += tokens.input || 0;
                totalOutputTokens += tokens.output || 0;
              }

              return {
                success: true,
                summary: lastMessageText || "Task execution completed",
                messageCount: seenMessageIds.size,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens,
              };
            }
            break;
          }

          case "session.error": {
            if ("error" in event.properties && event.properties.error && typeof event.properties.error === "object") {
              const error = event.properties.error as { message?: unknown };
              const errorMessage = typeof error.message === "string" ? error.message : "Unknown error";
              
              onProgress?.({ type: "error", error: errorMessage });
              
              return {
                success: false,
                error: errorMessage,
              };
            }
            break;
          }

          case "message.updated": {
            if (
              "info" in event.properties &&
              event.properties.info &&
              typeof event.properties.info === "object" &&
              "role" in event.properties.info &&
              "id" in event.properties.info &&
              typeof event.properties.info.id === "string" &&
              (event.properties.info.role === "user" || event.properties.info.role === "assistant")
            ) {
              const messageInfo = event.properties.info as {
                id: string;
                role: "user" | "assistant";
                sessionID: string;
                tokens?: { input: number; output: number; };
              };
              hasMessages = true;
              lastMessageRole = messageInfo.role;

              // Track unique messages
              if (!seenMessageIds.has(messageInfo.id)) {
                seenMessageIds.add(messageInfo.id);
              }

              console.log(`[session-monitor] Message updated for session ${sessionId}: role=${messageInfo.role}, messageId=${messageInfo.id}`);

              // Collect token stats from assistant messages
              if (messageInfo.role === "assistant" && "tokens" in event.properties.info) {
                const tokens = (event.properties.info as { tokens?: { input: number; output: number; } }).tokens;
                if (tokens) {
                  // Replace (not add) tokens for this message
                  messageTokens.set(messageInfo.id, tokens);
                  console.log(`[session-monitor] Tokens for message ${messageInfo.id}: input=${tokens.input}, output=${tokens.output}`);
                }
              }

              // Calculate total tokens across all messages
              let totalInputTokens = 0;
              let totalOutputTokens = 0;
              for (const tokens of messageTokens.values()) {
                totalInputTokens += tokens.input || 0;
                totalOutputTokens += tokens.output || 0;
              }

              console.log(`[session-monitor] Total stats: ${seenMessageIds.size} messages, ${totalInputTokens} input tokens, ${totalOutputTokens} output tokens`);

              // Emit stats update event
              onProgress?.({
                type: "stats",
                messageCount: seenMessageIds.size,
                inputTokens: totalInputTokens,
                outputTokens: totalOutputTokens
              });

              // Fetch the full message to get text content
              try {
                const messageResp = await client.session.message({
                  path: { id: sessionId, messageID: messageInfo.id },
                });
                
                if (messageResp.data) {
                  const textParts = messageResp.data.parts.filter(part => part.type === "text");
                  lastMessageText = textParts.map(part => part.text).join("\n");

                  // Check if this is a question (message from assistant with question indicators)
                  if (messageInfo.role === "assistant" && lastMessageText) {
                    const questionIndicators = ["?", "please provide", "what is", "which", "how"];
                    const hasQuestion = questionIndicators.some((indicator) =>
                      lastMessageText.toLowerCase().includes(indicator)
                    );

                    if (hasQuestion) {
                      onProgress?.({ type: "question", question: lastMessageText });
                    } else {
                      onProgress?.({ type: "message", message: lastMessageText });
                    }
                  }
                }
              } catch (error) {
                console.error("Failed to fetch message content:", error);
              }
            }
            break;
          }

          case "session.deleted": {
            return {
              success: false,
              error: "Session was deleted",
            };
          }
        }
      }

      // Stream ended without completion
      return {
        success: false,
        error: "Event stream ended unexpectedly",
      };
    } catch (error) {
      console.error("Failed to monitor session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  })();

  // Race between monitoring and timeout
  return Promise.race([monitorPromise, timeoutPromise]);
}

/**
 * Check if an OpenCode session is complete (one-time check, no monitoring).
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
 * @deprecated Use monitorSession instead - event-based monitoring is more efficient
 * 
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
): Promise<SessionCompletionResult> {
  const maxAttempts = 360; // 30 minutes with 5s interval
  let attempts = 0;

  while (attempts < maxAttempts) {
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
      try {
        const client = opencodeClient();
        const messagesResp = await client.session.messages({
          path: { id: sessionId },
        });
        const messages = messagesResp.data || [];

        if (messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          if (lastMessage.info.role === "assistant") {
            const textParts = lastMessage.parts.filter(part => part.type === "text");
            const text = textParts.map(part => part.text).join("\n");

            const questionIndicators = ["?", "please provide", "what is", "which", "how"];
            const hasQuestion = questionIndicators.some((indicator) =>
              text.toLowerCase().includes(indicator)
            );

            if (hasQuestion) {
              onProgress(text);
            }
          }
        }
      } catch (error) {
        console.error("Failed to check for questions:", error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  return {
    success: false,
    error: "Session polling timeout (30 minutes)",
  };
}
