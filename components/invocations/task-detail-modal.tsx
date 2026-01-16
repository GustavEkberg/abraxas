"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Comment } from "./comment";
import { AddCommentForm } from "./add-comment-form";
import { AVAILABLE_TASK_MODELS } from "@/lib/constants";

interface Task {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  executionState: string;
  model: string;
  createdAt: Date;
  messageCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  branchName?: string | null;
  pullRequestUrl?: string | null;
}

interface Comment {
  id: string;
  content: string;
  isAgentComment: boolean;
  agentName?: string | null;
  userId?: string | null;
  userName?: string | null;
  createdAt: Date;
}

interface TaskDetailModalProps {
  task: Task | null;
  ritualId: string;
  repositoryUrl?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

/**
 * Task detail modal showing full task info and comments.
 */
export function TaskDetailModal({
  task,
  ritualId,
  repositoryUrl,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [updatingType, setUpdatingType] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [updatingModel, setUpdatingModel] = useState(false);
  const [selectedExecutionState, setSelectedExecutionState] = useState<string>("");
  const [updatingExecutionState, setUpdatingExecutionState] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const AVAILABLE_TYPES = [
    "bug",
    "feature",
    "plan",
    "other",
  ];

  const AVAILABLE_EXECUTION_STATES = [
    "idle",
    "in_progress",
    "awaiting_review",
    "completed",
    "error",
  ];

  const fetchComments = useCallback(async () => {
    if (!task) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/rituals/${ritualId}/tasks/${task.id}/comments`
      );
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoading(false);
    }
  }, [ritualId, task]);

  useEffect(() => {
    if (task && open) {
      fetchComments();
      setSelectedType(task.type);
      setSelectedModel(task.model);
      setSelectedExecutionState(task.executionState);
    }
  }, [task, open, fetchComments]);

  const handleAddComment = useCallback(async (content: string) => {
    if (!task) return;

    const response = await fetch(
      `/api/rituals/${ritualId}/tasks/${task.id}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );

    if (response.ok) {
      await fetchComments();
    } else {
      throw new Error("Failed to post comment");
    }
  }, [ritualId, task, fetchComments]);

  const handleTypeChange = useCallback(async (type: string) => {
    if (!task) return;

    setSelectedType(type);
    setUpdatingType(true);

    try {
      const response = await fetch(
        `/api/rituals/${ritualId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task type");
      }

      onUpdate?.();
    } catch (error) {
      console.error("Failed to update type:", error);
      setSelectedType(task.type);
    } finally {
      setUpdatingType(false);
    }
  }, [ritualId, task, onUpdate]);

  const handleModelChange = useCallback(async (model: string) => {
    if (!task) return;

    setSelectedModel(model);
    setUpdatingModel(true);

    try {
      const response = await fetch(
        `/api/rituals/${ritualId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task model");
      }

      onUpdate?.();
    } catch (error) {
      console.error("Failed to update model:", error);
      setSelectedModel(task.model);
    } finally {
      setUpdatingModel(false);
    }
  }, [ritualId, task, onUpdate]);

  const handleExecutionStateChange = useCallback(async (executionState: string) => {
    if (!task) return;

    setSelectedExecutionState(executionState);
    setUpdatingExecutionState(true);

    try {
      const response = await fetch(
        `/api/rituals/${ritualId}/tasks/${task.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ executionState }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task execution state");
      }

      onUpdate?.();
    } catch (error) {
      console.error("Failed to update execution state:", error);
      setSelectedExecutionState(task.executionState);
    } finally {
      setUpdatingExecutionState(false);
    }
  }, [ritualId, task, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!task) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/rituals/${ritualId}/tasks/${task.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      setDeleteConfirmOpen(false);
      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to delete task:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [ritualId, task, onOpenChange, onUpdate]);

  if (!task) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl lg:max-w-6xl max-h-[80vh] overflow-y-auto border-white/10 bg-zinc-950 text-white">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-white/90">
              {task.title}
            </DialogTitle>
            <Button
              onClick={() => setDeleteConfirmOpen(true)}
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
            >
              Delete
            </Button>
          </DialogHeader>

          {/* Task metadata */}
          <div className="mb-6 flex items-center gap-4 flex-wrap">
            <span className="text-sm text-white/60">Status:</span>
            <span className="rounded-full bg-red-500/20 px-3 py-1 text-red-400 text-sm">
              {task.status}
            </span>
            {task.branchName && repositoryUrl && (
              <>
                <span className="text-sm text-white/60 ml-4">Branch:</span>
                <a
                  href={`${repositoryUrl}/tree/${task.branchName}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-purple-500/20 px-3 py-1 text-purple-400 text-sm hover:bg-purple-500/30 transition-colors duration-200"
                >
                  {task.branchName}
                </a>
              </>
            )}
            <span className="text-sm text-white/60 ml-4">Type:</span>
            <Select value={selectedType} onValueChange={handleTypeChange} disabled={updatingType}>
              <SelectTrigger className="w-fit border-white/10 bg-zinc-900/50">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-950">
                {AVAILABLE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-white/60 ml-4">Model:</span>
            <Select value={selectedModel} onValueChange={handleModelChange} disabled={updatingModel}>
              <SelectTrigger className="w-fit border-white/10 bg-zinc-900/50">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-950">
                {AVAILABLE_TASK_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-white/60 ml-4">Execution State:</span>
            <Select value={selectedExecutionState} onValueChange={handleExecutionStateChange} disabled={updatingExecutionState}>
              <SelectTrigger className="w-fit border-white/10 bg-zinc-900/50">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-950">
                {AVAILABLE_EXECUTION_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state.charAt(0).toUpperCase() + state.slice(1).replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Session stats */}
          {((task.messageCount !== undefined && task.messageCount > 0) ||
            (task.inputTokens !== undefined && task.inputTokens > 0) ||
            (task.outputTokens !== undefined && task.outputTokens > 0)) && (
              <div className="mb-6 flex items-center gap-4">
                <span className="text-sm text-white/60">Session Stats:</span>
                <span className="rounded bg-red-500/10 px-3 py-1 text-red-400 text-sm">
                  {task.messageCount || 0} messages
                </span>
                {((task.inputTokens || 0) + (task.outputTokens || 0) > 0) && (
                  <span className="rounded bg-red-500/10 px-3 py-1 text-red-400 text-sm">
                    {Math.round(((task.inputTokens || 0) + (task.outputTokens || 0)) / 1000)}k tokens
                  </span>
                )}
              </div>
            )}

          {/* Description */}
          <div className="mb-8">
            <h3 className="mb-2 text-sm font-medium text-white/60">
              Description
            </h3>
            <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4 text-white/80 whitespace-pre-wrap">
              {task.description}
            </div>
          </div>

          {/* Comments section */}
          <div className="border-t border-white/10 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-white/90">
              Comments
            </h3>

            {loading ? (
              <div className="py-8 text-center text-white/40">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="mb-6 py-8 text-center text-white/40">
                No comments yet
              </div>
            ) : (
              <div className="mb-6 max-h-[400px] overflow-y-auto">
                {comments.map((comment) => (
                  <Comment
                    key={comment.id}
                    content={comment.content}
                    isAgentComment={comment.isAgentComment}
                    agentName={comment.agentName}
                    userName={comment.userName}
                    createdAt={comment.createdAt}
                  />
                ))}
              </div>
            )}

            {/* Add comment form */}
            <AddCommentForm onSubmit={handleAddComment} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm border-white/10 bg-zinc-950 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white/90">
              Delete invocation
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-white/70">
              Are you sure you want to delete this invocation? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setDeleteConfirmOpen(false)}
              variant="outline"
              className="border-white/10 text-white/70 hover:text-white"
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
