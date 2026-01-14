"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CreateInvocationDialogProps {
  ritualId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvocationCreated: () => void;
}

/**
 * Dialog for creating a new invocation.
 * Includes all fields: title, description, priority, labels, due date.
 */
export function CreateInvocationDialog({
  ritualId,
  open,
  onOpenChange,
  onInvocationCreated,
}: CreateInvocationDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "">(
    ""
  );
  const [labels, setLabels] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("");
    setLabels("");
    setDueDate("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError("Title and description are required");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/rituals/${ritualId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority: priority || null,
          labels: labels
            ? labels.split(",").map((label) => label.trim())
            : null,
          dueDate: dueDate || null,
        }),
      });

      if (response.ok) {
        resetForm();
        onOpenChange(false);
        onInvocationCreated();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to create invocation");
      }
    } catch (err) {
      setError("Failed to create invocation");
      console.error("Failed to create invocation:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-purple-500/20 bg-zinc-950 sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="text-white/90">
            Cast New Invocation
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Summon a new invocation to The Abyss. All fields marked with * are
            required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white/90">
                Title *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="border-white/10 bg-zinc-900 text-white/90 placeholder:text-white/40"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/90">
                Description *
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the invocation in detail (supports markdown)"
                className="min-h-[120px] border-white/10 bg-zinc-900 text-white/90 placeholder:text-white/40"
                required
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority" className="text-white/90">
                Priority
              </Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPriority("low")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-all duration-200 ${
                    priority === "low"
                      ? "border-green-500/40 bg-green-500/20 text-green-300"
                      : "border-white/10 bg-zinc-900 text-white/60 hover:border-white/20 hover:bg-zinc-800"
                  }`}
                >
                  Low
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("medium")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-all duration-200 ${
                    priority === "medium"
                      ? "border-yellow-500/40 bg-yellow-500/20 text-yellow-300"
                      : "border-white/10 bg-zinc-900 text-white/60 hover:border-white/20 hover:bg-zinc-800"
                  }`}
                >
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => setPriority("high")}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm transition-all duration-200 ${
                    priority === "high"
                      ? "border-red-500/40 bg-red-500/20 text-red-300"
                      : "border-white/10 bg-zinc-900 text-white/60 hover:border-white/20 hover:bg-zinc-800"
                  }`}
                >
                  High
                </button>
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <Label htmlFor="labels" className="text-white/90">
                Labels
              </Label>
              <Input
                id="labels"
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                placeholder="feature, bug, enhancement (comma-separated)"
                className="border-white/10 bg-zinc-900 text-white/90 placeholder:text-white/40"
              />
              <p className="text-xs text-white/40">
                Separate multiple labels with commas
              </p>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-white/90">
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="border-white/10 bg-zinc-900 text-white/90"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 bg-transparent text-white/60 hover:bg-zinc-900 hover:text-white/90"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-purple-600 text-white transition-all duration-200 hover:bg-purple-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Casting..." : "Cast Invocation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
