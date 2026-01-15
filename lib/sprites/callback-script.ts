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
set -euo pipefail

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
    local progress_data="\${5:-}"
    
    echo "Sending webhook: type=$type"
    
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
    elif [ "$type" = "progress" ]; then
        payload='{"type":"progress","sessionId":"'"$SESSION_ID"'","taskId":"'"$TASK_ID"'","progress":'"$progress_data"'}'
    else
        payload='{"type":"'"$type"'","sessionId":"'"$SESSION_ID"'","taskId":"'"$TASK_ID"'"}'
    fi
    
    # Generate HMAC signature
    local signature
    signature="sha256=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')"
    
    echo "Webhook URL: $WEBHOOK_URL"
    echo "Payload length: \${#payload} bytes"
    
    # Send webhook with verbose output and proper error handling
    local response_code
    response_code=$(curl -w "%{http_code}" -o /tmp/webhook-response.txt -X POST "$WEBHOOK_URL" \\
        -H "Content-Type: application/json" \\
        -H "X-Webhook-Signature: $signature" \\
        -d "$payload" 2>&1)
    
    local curl_exit=$?
    
    if [ $curl_exit -eq 0 ] && [ "$response_code" = "200" ]; then
        echo "Webhook sent successfully (HTTP $response_code)"
        [ -f /tmp/webhook-response.txt ] && cat /tmp/webhook-response.txt
        return 0
    else
        echo "ERROR: Webhook failed (curl exit: $curl_exit, HTTP: $response_code)"
        [ -f /tmp/webhook-response.txt ] && cat /tmp/webhook-response.txt
        echo "Full curl output: $response_code"
        return 1
    fi
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

# Function to extract token counts from OpenCode JSON events
extract_token_stats() {
    local json_file="$1"
    
    if [ ! -f "$json_file" ]; then
        echo '{"messageCount":0,"inputTokens":0,"outputTokens":0}'
        return
    fi
    
    # Parse JSON events to extract token usage
    # OpenCode outputs events like: {"type":"step_finish","tokens":{"input":254,"output":51}}
    local message_count=0
    local input_tokens=0
    local output_tokens=0
    
    # Count step_finish events as message count (each step is a turn)
    message_count=$(grep -c '"type":"step_finish"' "$json_file" 2>/dev/null || echo "0")
    
    # Extract all "input" token values from nested tokens object and sum them
    # Pattern: "tokens":{"input":123,...}
    input_tokens=$(grep -o '"tokens":{[^}]*"input":[0-9]*' "$json_file" 2>/dev/null | grep -o '"input":[0-9]*' | grep -o '[0-9]*' | awk '{s+=\$1} END {print s+0}')
    
    # Extract all "output" token values from nested tokens object and sum them
    output_tokens=$(grep -o '"tokens":{[^}]*"output":[0-9]*' "$json_file" 2>/dev/null | grep -o '"output":[0-9]*' | grep -o '[0-9]*' | awk '{s+=\$1} END {print s+0}')
    
    # Default to 0 if empty
    message_count=\${message_count:-0}
    input_tokens=\${input_tokens:-0}
    output_tokens=\${output_tokens:-0}
    
    # Return JSON object with counts
    echo '{"messageCount":'"$message_count"',"inputTokens":'"$input_tokens"',"outputTokens":'"$output_tokens"'}'
}

# Function to send progress updates periodically
monitor_progress() {
    local json_file="$1"
    local output_file="$2"
    local pid="$3"
    
    echo "[Progress Monitor] Starting progress monitoring for PID $pid"
    
    while kill -0 "$pid" 2>/dev/null; do
        echo "[Progress Monitor] Waiting 10 seconds..."
        sleep 10
        
        echo "[Progress Monitor] Checking if process $pid is still running..."
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "[Progress Monitor] Process finished, exiting monitor"
            break
        fi
        
        echo "[Progress Monitor] Extracting progress data from JSON events"
        
        # Get last line from text output for progress message
        local last_line=""
        if [ -f "$output_file" ]; then
            # Get the last JSON event and extract message content if available
            last_line=$(tail -n 5 "$json_file" 2>/dev/null | grep -o '"content":"[^"]*"' | tail -1 | sed 's/"content":"//;s/"$//' | head -c 200 || echo "Processing...")
            echo "[Progress Monitor] Last message: \${last_line:0:50}..."
        else
            echo "[Progress Monitor] Output file not found: $output_file"
            last_line="Processing..."
        fi
        
        # Extract token stats from JSON events
        echo "[Progress Monitor] Extracting token stats from JSON..."
        local stats=$(extract_token_stats "$json_file")
        echo "[Progress Monitor] Stats: $stats"
        
        # Parse stats JSON for building progress
        local msg_count=$(echo "$stats" | grep -o '"messageCount":[0-9]*' | grep -o '[0-9]*' || echo "0")
        local in_tokens=$(echo "$stats" | grep -o '"inputTokens":[0-9]*' | grep -o '[0-9]*' | tail -1 || echo "0")
        local out_tokens=$(echo "$stats" | grep -o '"outputTokens":[0-9]*' | grep -o '[0-9]*' | tail -1 || echo "0")
        
        # Ensure we have valid numbers (default to 0 if empty)
        msg_count=\${msg_count:-0}
        in_tokens=\${in_tokens:-0}
        out_tokens=\${out_tokens:-0}
        
        # Build progress JSON
        local progress_json='{"message":"'"$last_line"'","messageCount":'"$msg_count"',"inputTokens":'"$in_tokens"',"outputTokens":'"$out_tokens"'}'
        
        echo "[Progress Monitor] Sending progress webhook with: $progress_json"
        # Send progress webhook (don't fail if webhook fails)
        if send_webhook "progress" "" "" "" "$progress_json"; then
            echo "[Progress Monitor] Progress webhook sent successfully"
        else
            echo "[Progress Monitor] Progress webhook failed (continuing anyway)"
        fi
    done
    
    echo "[Progress Monitor] Monitor loop exited"
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
set +e  # Temporarily disable exit on error to handle webhook
if ! git clone "${authRepoUrl}" /home/sprite/repo 2>&1; then
    echo "ERROR: Failed to clone repository"
    send_webhook "error" "" "Failed to clone repository" "" ""
    exit 1
fi
set -e

cd /home/sprite/repo

# Configure git
git config user.email "${gitUserEmail}"
git config user.name "${gitUserName}"

# Create and checkout branch
echo "Creating branch: $BRANCH_NAME"
set +e  # Temporarily disable exit on error to handle webhook
if ! git checkout -b "$BRANCH_NAME" 2>&1; then
    echo "ERROR: Failed to create branch: $BRANCH_NAME"
    send_webhook "error" "" "Failed to create branch: $BRANCH_NAME" "" ""
    exit 1
fi
set -e

echo ""
echo "Running opencode..."
echo "================================"

# Run opencode and capture output to file
OPENCODE_OUTPUT_FILE="/tmp/opencode-output.txt"
OPENCODE_JSON_FILE="/tmp/opencode-events.jsonl"
OPENCODE_EXIT_CODE=0

# Run opencode with JSON format for easy parsing of events
echo "Starting OpenCode in background..."
# Redirect output to JSON file while also showing on console
opencode run --format json "${escapedPrompt} !ALWAYS COMMIT YOUR WORK TO BRANCH ${branchName} AND PUSH WHEN YOU ARE DONE!" 2>&1 | tee "$OPENCODE_OUTPUT_FILE" | tee "$OPENCODE_JSON_FILE" &
OPENCODE_PID=$!
echo "OpenCode started with PID: $OPENCODE_PID"

# Start progress monitor in background
echo "Starting progress monitor in background..."
monitor_progress "$OPENCODE_JSON_FILE" "$OPENCODE_OUTPUT_FILE" "$OPENCODE_PID" &
MONITOR_PID=$!
echo "Progress monitor started with PID: $MONITOR_PID"

# Wait for OpenCode to finish
echo "Waiting for OpenCode to complete..."
if wait "$OPENCODE_PID"; then
    OPENCODE_EXIT_CODE=0
else
    OPENCODE_EXIT_CODE=$?
fi

# Stop progress monitor
echo "Stopping progress monitor (PID: $MONITOR_PID)..."
kill "$MONITOR_PID" 2>/dev/null || true
wait "$MONITOR_PID" 2>/dev/null || true
echo "Progress monitor stopped"

echo ""
echo "================================"
echo "OpenCode exit code: $OPENCODE_EXIT_CODE"

# Extract summary and stats from opencode output
SUMMARY=""
STATS_JSON=""
if [ -f "$OPENCODE_JSON_FILE" ]; then
    # Extract text content from the last 3 text events and take last 500 chars
    # Look for "type":"text" events and extract the "text" field
    SUMMARY=$(grep '"type":"text"' "$OPENCODE_JSON_FILE" | tail -3 | grep -o '"text":"[^"]*"' | sed 's/"text":"//;s/"$//' | tr '\\n' ' ' | tail -c 500 | sed 's/\\\\/\\\\\\\\/g' | sed 's/"/\\\\"/g')
    
    # If no text found, use a generic message
    if [ -z "$SUMMARY" ]; then
        SUMMARY="Task completed successfully"
    fi
    
    # Extract final token stats from JSON events
    STATS_JSON=$(extract_token_stats "$OPENCODE_JSON_FILE")
fi

# Disable exit on error for final webhook sending
set +e

# Check result and send webhook
if [ $OPENCODE_EXIT_CODE -eq 0 ]; then
    echo "Execution completed successfully"
    
    if [ -n "$SUMMARY" ]; then
        send_webhook "completed" "$SUMMARY" "" "$STATS_JSON"
    else
        send_webhook "completed" "Task executed successfully" "" "$STATS_JSON"
    fi
    
    WEBHOOK_EXIT=$?
    if [ $WEBHOOK_EXIT -ne 0 ]; then
        echo "WARNING: Webhook send failed, but task completed successfully"
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
    send_webhook "error" "" "$ERROR_CONTEXT" "" ""
    
    WEBHOOK_EXIT=$?
    if [ $WEBHOOK_EXIT -ne 0 ]; then
        echo "ERROR: Failed to send error webhook"
    fi
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
