"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Comment } from "./comment";
import { AddCommentForm } from "./add-comment-form";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  executionState: string;
  createdAt: Date;
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Task detail modal showing full task info and comments.
 */
export function TaskDetailModal({
  task,
  ritualId,
  open,
  onOpenChange,
}: TaskDetailModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

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

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl lg:max-w-6xl max-h-[80vh] overflow-y-auto border-white/10 bg-zinc-950 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white/90">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        {/* Task metadata */}
        <div className="mb-6 flex items-center gap-4 text-sm">
          <span className="rounded-full bg-purple-500/20 px-3 py-1 text-purple-400">
            {task.status}
          </span>
          <span className="text-white/40">
            {task.executionState !== "idle" && (
              <span className="text-cyan-400">{task.executionState}</span>
            )}
          </span>
        </div>

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
  );
}
