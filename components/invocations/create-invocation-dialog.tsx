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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskModel, TaskType } from "@/schemas";

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
  const [type, setType] = useState<TaskType>("feature");
  const [model, setModel] = useState("grok-1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const AVAILABLE_TYPES: TaskType[] = [
    "bug",
    "feature",
    "plan",
    "other",
  ];

  const AVAILABLE_MODELS: TaskModel[] = [
    "grok-1",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
  ];

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setType("feature");
    setModel("grok-1");
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
          type,
          model,
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
            Summon a new invocation to The Abyss.
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

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type" className="text-white/90">
                Type
              </Label>
              <Select value={type} onValueChange={(value) => setType(value as TaskType)}>
                <SelectTrigger className="border-white/10 bg-zinc-900">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950">
                  {AVAILABLE_TYPES.map((taskType) => (
                    <SelectItem key={taskType} value={taskType}>
                      {taskType.charAt(0).toUpperCase() + taskType.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-white/90">
                AI Model
              </Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="border-white/10 bg-zinc-900">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-950">
                  {AVAILABLE_MODELS.map((modelName) => (
                    <SelectItem key={modelName} value={modelName}>
                      {modelName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
