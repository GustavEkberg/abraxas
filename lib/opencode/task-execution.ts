import { TaskType } from "@/schemas"

interface Comment {
  content: string
  isAgentComment: boolean
  agentName?: string | null
  createdAt: Date
}

/**
 * Build prompt text from task and comments.
 * Used to generate the prompt sent to OpenCode in sprites.
 */
export function buildTaskPrompt(
  task: { title: string; description: string; type: TaskType },
  comments: Comment[]
): string {
  const contextParts: string[] = []

  // Add task details
  contextParts.push(`# Task: ${task.title}\n`)
  contextParts.push(
    `**Type:** ${task.type.charAt(0).toUpperCase() + task.type.slice(1)}\n`
  )
  contextParts.push(`## Description\n${task.description}\n`)

  // Add comment history for context
  if (comments.length > 0) {
    contextParts.push(`## Comment History\n`)
    comments.forEach((comment) => {
      const author = comment.isAgentComment
        ? comment.agentName || "Agent"
        : "User"
      contextParts.push(
        `**${author}** (${new Date(comment.createdAt).toLocaleString()}):\n${comment.content}\n`
      )
    })
  }

  return contextParts.join("\n")
}
