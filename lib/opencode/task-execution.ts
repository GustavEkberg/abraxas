import { opencodeClient } from "./client";
import type { Session, Message } from "@opencode-ai/sdk";

interface Task {
  id: string;
  title: string;
  description: string;
}

interface Project {
  id: string;
  name: string;
  repositoryPath: string;
}

interface Comment {
  content: string;
  isAgentComment: boolean;
  agentName?: string | null;
  createdAt: Date;
}

/**
 * Execute a task using OpenCode.
 * 
 * Creates a new OpenCode session with the task context and returns the session ID.
 * OpenCode will automatically read AGENTS.md from the repository path.
 * 
 * @param task - The task to execute
 * @param project - The project (ritual) containing repository path
 * @param comments - All comments on the task for context
 * @returns OpenCode session ID
 */
export async function executeTask(
  task: Task,
  project: Project,
  comments: Comment[]
): Promise<string> {
  // Create a new session for this task execution
  const client = opencodeClient(project.repositoryPath);
  const sessionResponse = await client.session.create({
    body: {
      title: `Task: ${task.title}`,
    },
  });

  const session = sessionResponse.data;
  if (!session?.id) {
    throw new Error("Failed to create OpenCode session");
  }

  // Build the context prompt from task + comments
  const contextParts: string[] = [];

  // Add task details
  contextParts.push(`# Task: ${task.title}\n`);
  contextParts.push(`## Description\n${task.description}\n`);

  // Add comment history for context
  if (comments.length > 0) {
    contextParts.push(`## Comment History\n`);
    comments.forEach((comment) => {
      const author = comment.isAgentComment
        ? comment.agentName || "Agent"
        : "User";
      contextParts.push(
        `**${author}** (${new Date(comment.createdAt).toLocaleString()}):\n${comment.content}\n`
      );
    });
  }

  const promptText = contextParts.join("\n");

  // Send the initial prompt to OpenCode with Abraxas agent and Claude Sonnet 4.5
  // The agent parameter tells OpenCode to use the Abraxas task execution agent
  // OpenCode will also read AGENTS.md from the repository automatically
  await client.session.prompt({
    path: { id: session.id },
    body: {
      agent: "abraxas-task-executor",
      model: {
        // providerID: "anthropic",
        providerID: "opencode",
        //modelID: "claude-sonnet-4-5-20250929",
        modelID: "grok-code",
      },
      parts: [{ type: "text", text: promptText }],
    },
  });

  return session.id;
}

/**
 * Get the status and messages of an OpenCode session.
 */
export async function getSessionStatus(sessionId: string): Promise<{
  session: Session;
  messages: Array<{ info: Message; parts: unknown[]; }>;
}> {
  const client = opencodeClient();
  const [sessionResp, messagesResp] = await Promise.all([
    client.session.get({ path: { id: sessionId } }),
    client.session.messages({ path: { id: sessionId } }),
  ]);

  return {
    session: sessionResp.data!,
    messages: messagesResp.data || [],
  };
}

/**
 * Abort a running OpenCode session.
 */
export async function abortSession(sessionId: string): Promise<void> {
  const client = opencodeClient();
  await client.session.abort({ path: { id: sessionId } });
}
