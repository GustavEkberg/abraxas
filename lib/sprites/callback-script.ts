import { createHmac, randomBytes } from "crypto";

/**
 * Configuration for generating callback scripts.
 */
export interface CallbackScriptConfig {
  sessionId: string;
  taskId: string;
  webhookUrl: string;
  webhookSecret: string;
  prompt: string;
  repoUrl: string;
  githubToken: string;
  branchName: string;
  /** Optional setup script to run before cloning (e.g., install opencode) */
  setupScript?: string;
}

/**
 * Generate HMAC signature for webhook payload.
 */
export function generateSignature(payload: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
}

/**
 * Generate a random webhook secret.
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Default setup script - installs opencode if not present.
 */
export const DEFAULT_SETUP_SCRIPT = `
# Add common binary paths
export PATH="$HOME/.local/bin:$HOME/bin:$HOME/.opencode/bin:/usr/local/bin:$PATH"

echo "Checking for opencode..."
if ! command -v opencode &> /dev/null; then
    echo "Installing opencode..."
    curl -fsSL https://opencode.ai/install | bash
    
    # Re-source bashrc to pick up PATH changes
    [ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc"
    
    # Also try common install locations explicitly
    export PATH="$HOME/.local/bin:$HOME/bin:$HOME/.opencode/bin:$PATH"
fi

# Final check
if ! command -v opencode &> /dev/null; then
    echo "ERROR: opencode not found after installation"
    echo "PATH: $PATH"
    echo "Checking common locations:"
    ls -la "$HOME/.local/bin/" 2>/dev/null || echo "~/.local/bin not found"
    ls -la "$HOME/bin/" 2>/dev/null || echo "~/bin not found"
    exit 1
fi

echo "opencode ready"
opencode --version || true
`;

/**
 * Generate the callback script that runs inside the Sprite.
 * 
 * This script:
 * 1. Runs setup script to install dependencies (if provided)
 * 2. Clones the repository using the GitHub token
 * 3. Creates and checks out a new branch
 * 4. Runs opencode with the prompt
 * 5. Captures the exit code and output
 * 6. Sends a webhook with the result
 */
export function generateCallbackScript(config: CallbackScriptConfig): string {
  const {
    sessionId,
    taskId,
    webhookUrl,
    webhookSecret,
    prompt,
    repoUrl,
    githubToken,
    branchName,
    setupScript = DEFAULT_SETUP_SCRIPT,
  } = config;

  // Escape special characters in the prompt for bash
  const escapedPrompt = prompt
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/`/g, "\\`");

  // Parse the repo URL to inject the token
  // https://github.com/owner/repo -> https://{token}@github.com/owner/repo
  const authRepoUrl = repoUrl.replace(
    "https://github.com/",
    `https://${githubToken}@github.com/`
  );

  // Git user config from environment
  const gitUserEmail = process.env.GH_USER_EMAIL || "abraxas@sprites.dev";
  const gitUserName = process.env.GH_USER_NAME || "Abraxas";

  return `#!/bin/bash
set -e

WEBHOOK_URL="${webhookUrl}"
WEBHOOK_SECRET="${webhookSecret}"
SESSION_ID="${sessionId}"
TASK_ID="${taskId}"
BRANCH_NAME="${branchName}"

# Function to send webhook
send_webhook() {
    local type="$1"
    local summary="$2"
    local error="$3"
    local stats="$4"
    
    # Build JSON payload
    local payload
    if [ "$type" = "completed" ]; then
        if [ -n "$stats" ]; then
            payload='{"type":"completed","sessionId":"'"$SESSION_ID"'","taskId":"'"$TASK_ID"'","summary":"'"$summary"'","stats":'"$stats"'}'
        else
            payload='{"type":"completed","sessionId":"'"$SESSION_ID"'","taskId":"'"$TASK_ID"'","summary":"'"$summary"'"}'
        fi
    elif [ "$type" = "error" ]; then
        payload='{"type":"error","sessionId":"'"$SESSION_ID"'","taskId":"'"$TASK_ID"'","error":"'"$error"'"}'
    else
        payload='{"type":"'"$type"'","sessionId":"'"$SESSION_ID"'","taskId":"'"$TASK_ID"'"}'
    fi
    
    # Generate HMAC signature
    local signature
    signature="sha256=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"
    
    # Send webhook
    curl -s -X POST "$WEBHOOK_URL" \\
        -H "Content-Type: application/json" \\
        -H "X-Webhook-Signature: $signature" \\
        -d "$payload"
}

# Function to escape JSON strings
escape_json() {
    local str="$1"
    str=\${str//\\\\/\\\\\\\\}
    str=\${str//\\"/\\\\\\"}
    str=\${str//	/\\\\t}
    str=\${str//$'\\n'/\\\\n}
    str=\${str//$'\\r'/\\\\r}
    echo "$str"
}

echo "=== Abraxas Sprite Execution ==="
echo "Session: $SESSION_ID"
echo "Task: $TASK_ID"
echo ""

# Run setup script (install dependencies)
echo "=== Setup Phase ==="
${setupScript}
echo "=== Setup Complete ==="
echo ""

# Clone repository
echo "Cloning repository..."
if ! git clone "${authRepoUrl}" /home/sprite/repo 2>&1; then
    send_webhook "error" "" "Failed to clone repository"
    exit 1
fi

cd /home/sprite/repo

# Configure git
git config user.email "${gitUserEmail}"
git config user.name "${gitUserName}"

# Create and checkout branch
echo "Creating branch: $BRANCH_NAME"
if ! git checkout -b "$BRANCH_NAME" 2>&1; then
    send_webhook "error" "" "Failed to create branch: $BRANCH_NAME"
    exit 1
fi

echo ""
echo "Running opencode..."
echo "================================"

# Run opencode and capture output to file
OPENCODE_OUTPUT_FILE="/tmp/opencode-output.txt"
OPENCODE_EXIT_CODE=0

# Run opencode with the prompt, capturing output
if opencode run "${escapedPrompt} !ALWAYS COMMIT YOUR WORK TO BRANCH ${branchName} AND PUSH WHEN YOU ARE DONE!" 2>&1 | tee "$OPENCODE_OUTPUT_FILE"; then
    OPENCODE_EXIT_CODE=0
else
    OPENCODE_EXIT_CODE=\${PIPESTATUS[0]}
fi

echo ""
echo "================================"
echo "OpenCode exit code: $OPENCODE_EXIT_CODE"

# Extract summary from opencode output
# Get the last meaningful lines (skip empty lines, get last ~500 chars)
SUMMARY=""
if [ -f "$OPENCODE_OUTPUT_FILE" ]; then
    # Get last 20 non-empty lines, take last 500 chars, escape for JSON
    SUMMARY=$(tail -n 50 "$OPENCODE_OUTPUT_FILE" | grep -v '^$' | tail -c 500 | tr '\\n' ' ' | sed 's/"/\\\\"/g' | sed "s/'/\\\\'/g")
fi

# Check result and send webhook
if [ $OPENCODE_EXIT_CODE -eq 0 ]; then
    echo "Execution completed successfully"
    
    if [ -n "$SUMMARY" ]; then
        send_webhook "completed" "$SUMMARY" "" ""
    else
        send_webhook "completed" "Task executed successfully" "" ""
    fi
else
    echo "Execution failed with exit code: $OPENCODE_EXIT_CODE"
    
    # Include last output in error message for context
    ERROR_CONTEXT=""
    if [ -n "$SUMMARY" ]; then
        ERROR_CONTEXT="OpenCode exited with code $OPENCODE_EXIT_CODE. Last output: $SUMMARY"
    else
        ERROR_CONTEXT="OpenCode exited with code $OPENCODE_EXIT_CODE"
    fi
    send_webhook "error" "" "$ERROR_CONTEXT"
fi

echo ""
echo "=== Execution Complete ==="
`;
}

/**
 * Generate a simpler inline command for execution.
 * 
 * This is a fallback for environments where we can't write a full script.
 */
export function generateInlineCommand(config: CallbackScriptConfig): string {
  const {
    prompt,
    repoUrl,
    githubToken,
    branchName,
  } = config;

  // Parse the repo URL to inject the token
  const authRepoUrl = repoUrl.replace(
    "https://github.com/",
    `https://${githubToken}@github.com/`
  );

  const escapedPrompt = prompt.replace(/'/g, "'\\''");

  return `git clone '${authRepoUrl}' '/home/sprite/repo' && cd '/home/sprite/repo' && git checkout -b '${branchName}' && opencode '${escapedPrompt}'`;
}
