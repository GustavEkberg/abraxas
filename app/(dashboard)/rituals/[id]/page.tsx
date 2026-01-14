"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { CreateInvocationDialog } from "@/components/invocations/create-invocation-dialog";
import { TaskDetailModal } from "@/components/invocations/task-detail-modal";
import { useFireIntensity } from "@/lib/contexts/fire-intensity-context";

interface Ritual {
  id: string;
  name: string;
  description: string | null;
  repositoryPath: string;
}

interface Invocation {
  id: string;
  title: string;
  description: string;
  status: string;
  executionState: string;
  model: string;
  createdAt: Date;
}

const COLUMNS = [
  {
    id: "abyss",
    title: "The Abyss",
    description: "Invocations waiting in darkness",
    color: "border-white/10",
  },
  {
    id: "altar",
    title: "The Altar",
    description: "Prepared for execution",
    color: "border-purple-500/20",
  },
  {
    id: "ritual",
    title: "The Ritual",
    description: "Active invocations",
    color: "border-cyan-500/20",
  },
  {
    id: "cursed",
    title: "Cursed",
    description: "Blocked with errors",
    color: "border-red-500/20",
  },
  {
    id: "trial",
    title: "The Trial",
    description: "Awaiting review",
    color: "border-yellow-500/20",
  },
  {
    id: "vanquished",
    title: "Vanquished",
    description: "Successfully completed",
    color: "border-green-500/20",
  },
] as const;

/**
 * Droppable column component for drag-and-drop.
 */
function DroppableColumn({
  id,
  color,
  children,
}: {
  id: string;
  color: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[280px] flex-col rounded-lg border bg-zinc-950/50 p-4 transition-colors ${
        isOver ? "border-purple-500/40 bg-zinc-900/50" : ""
      }`}
      style={{
        borderColor: isOver
          ? undefined
          : color.replace("border-", "").replace("/", " / "),
      }}
    >
      {children}
    </div>
  );
}

/**
 * Draggable invocation card component.
 */
function DraggableCard({ 
  invocation, 
  onClick 
}: { 
  invocation: Invocation;
  onClick: (invocation: Invocation) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: invocation.id,
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Determine visual styling based on execution state
  const isExecuting = invocation.executionState === "in_progress";
  const isError = invocation.executionState === "error";
  const isCompleted = invocation.executionState === "completed";

  const borderColor = isExecuting
    ? "border-cyan-500/40"
    : isError
      ? "border-red-500/40"
      : isCompleted
        ? "border-green-500/40"
        : "border-white/10";

  const bgColor = isExecuting
    ? "bg-cyan-950/20"
    : isError
      ? "bg-red-950/20"
      : "bg-zinc-900";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(invocation)}
      className={`cursor-grab p-4 transition-all duration-200 hover:border-white/20 hover:bg-zinc-800 ${borderColor} ${bgColor} ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium text-white/90">{invocation.title}</h3>
        {isExecuting && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
            <span className="text-xs text-cyan-400">Executing</span>
          </div>
        )}
        {isError && (
          <span className="text-xs text-red-400">Error</span>
        )}
        {isCompleted && (
          <span className="text-xs text-green-400">✓</span>
        )}
      </div>
      <p className="line-clamp-2 text-sm text-white/60">
        {invocation.description}
      </p>
    </Card>
  );
}

/**
 * Ritual board view with six mystical columns.
 * Displays all invocations organized by their status.
 */
export default function RitualBoardPage({
  params,
}: {
  params: Promise<{ id: string; }>;
}) {
  const router = useRouter();
  const { addRunningTask, removeRunningTask } = useFireIntensity();
  const [ritualId, setRitualId] = useState<string | null>(null);
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [invocations, setInvocations] = useState<Invocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeInvocation, setActiveInvocation] = useState<Invocation | null>(
    null
  );
  const [selectedTask, setSelectedTask] = useState<Invocation | null>(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    params.then((p) => setRitualId(p.id));
  }, [params]);

  const fetchRitual = useCallback(async () => {
    if (!ritualId) return;
    try {
      const response = await fetch(`/api/rituals/${ritualId}`);
      if (response.ok) {
        const data = await response.json();
        setRitual(data);
      } else if (response.status === 404) {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to fetch ritual:", error);
    }
  }, [ritualId, router]);

  const fetchInvocations = useCallback(async () => {
    if (!ritualId) return;
    try {
      const response = await fetch(`/api/rituals/${ritualId}/tasks`);
      if (response.ok) {
        const data = await response.json();
        setInvocations(data);
      } else {
        console.error("Failed to fetch invocations:", response.statusText);
        setInvocations([]);
      }
    } catch (error) {
      console.error("Failed to fetch invocations:", error);
      setInvocations([]);
    } finally {
      setLoading(false);
    }
  }, [ritualId]);

  useEffect(() => {
    if (!ritualId) return;
    fetchRitual();
    fetchInvocations();
  }, [ritualId, fetchRitual, fetchInvocations]);

  // Sync running tasks with fire intensity context
  useEffect(() => {
    const runningInvocations = invocations.filter(
      (inv) => inv.executionState === "in_progress"
    );

    // Add any new running tasks to fire intensity
    runningInvocations.forEach((inv) => {
      addRunningTask(inv.id);
    });

    // Remove completed tasks from fire intensity
    invocations
      .filter((inv) => inv.executionState !== "in_progress")
      .forEach((inv) => {
        removeRunningTask(inv.id);
      });
  }, [invocations, addRunningTask, removeRunningTask]);

  // Poll for running task status updates
  useEffect(() => {
    if (!ritualId) return;

    const runningInvocations = invocations.filter(
      (inv) => inv.executionState === "in_progress"
    );

    if (runningInvocations.length === 0) return;

    // Poll every 10 seconds for status updates
    const pollInterval = setInterval(async () => {
      for (const inv of runningInvocations) {
        try {
          const response = await fetch(
            `/api/rituals/${ritualId}/tasks/${inv.id}/status`
          );
          if (response.ok) {
            // Refresh invocations to get updated status
            await fetchInvocations();
          }
        } catch (error) {
          console.error("Failed to poll task status:", error);
        }
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [ritualId, invocations, fetchInvocations]);

  const getInvocationsByStatus = (status: string) => {
    return invocations.filter((invocation) => invocation.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const invocation = invocations.find((inv) => inv.id === event.active.id);
    setActiveInvocation(invocation || null);
  };

  const handleTaskClick = (invocation: Invocation) => {
    setSelectedTask(invocation);
    setShowTaskDetail(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveInvocation(null);

    if (!over || !ritualId) return;

    const invocationId = active.id as string;
    const newStatus = over.id as string;

    // Find the invocation
    const invocation = invocations.find((inv) => inv.id === invocationId);
    if (!invocation || invocation.status === newStatus) return;

    // Optimistically update UI
    setInvocations((prev) =>
      prev.map((inv) =>
        inv.id === invocationId ? { ...inv, status: newStatus } : inv
      )
    );

    // Update via API
    try {
      const response = await fetch(
        `/api/rituals/${ritualId}/tasks/${invocationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (!response.ok) {
        // Revert on error
        setInvocations((prev) =>
          prev.map((inv) =>
            inv.id === invocationId
              ? { ...inv, status: invocation.status }
              : inv
          )
        );
        console.error("Failed to update invocation status");
        return;
      }

      // If moved to "ritual" column, trigger execution
      if (newStatus === "ritual") {
        try {
          const executeResponse = await fetch(
            `/api/rituals/${ritualId}/tasks/${invocationId}/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            }
          );

          if (executeResponse.ok) {
            const result = await executeResponse.json();
            console.log("Execution started:", result);

            // Update execution state and add to fire intensity
            setInvocations((prev) =>
              prev.map((inv) =>
                inv.id === invocationId
                  ? { ...inv, executionState: "in_progress" }
                  : inv
              )
            );
            addRunningTask(invocationId);

            // Refresh invocations to get updated comments
            await fetchInvocations();
          } else {
            const error = await executeResponse.json();
            console.error("Failed to execute invocation:", error);
            // Move to cursed on execution error
            setInvocations((prev) =>
              prev.map((inv) =>
                inv.id === invocationId
                  ? { ...inv, status: "cursed", executionState: "error" }
                  : inv
              )
            );
          }
        } catch (executeError) {
          console.error("Failed to execute invocation:", executeError);
          // Move to cursed on execution error
          setInvocations((prev) =>
            prev.map((inv) =>
              inv.id === invocationId
                ? { ...inv, status: "cursed", executionState: "error" }
                : inv
            )
          );
        }
      }
    } catch (error) {
      // Revert on error
      setInvocations((prev) =>
        prev.map((inv) =>
          inv.id === invocationId ? { ...inv, status: invocation.status } : inv
        )
      );
      console.error("Failed to update invocation status:", error);
    }
  };

  if (loading || !ritual) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/40">Channeling the ritual...</div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/")}
          className="mb-4 text-sm text-white/60 transition-colors hover:text-white/90"
        >
          ← Return to Chamber
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white/90">{ritual.name}</h1>
            {ritual.description && (
              <p className="mt-2 text-white/60">{ritual.description}</p>
            )}
            <p className="mt-1 text-sm text-white/40">
              {ritual.repositoryPath}
            </p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-purple-700 active:scale-95"
          >
            Invoke New Invocation
          </button>
        </div>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-6 gap-4 overflow-x-auto">
        {COLUMNS.map((column) => {
          const columnInvocations = getInvocationsByStatus(column.id);

          return (
            <DroppableColumn key={column.id} id={column.id} color={column.color}>
              {/* Column Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white/90">
                    {column.title}
                  </h2>
                  <span className="rounded-full bg-white/5 px-2 py-1 text-xs text-white/60">
                    {columnInvocations.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {column.description}
                </p>
              </div>

              {/* Invocations */}
              <div className="flex-1 space-y-3">
                {columnInvocations.length === 0 ? (
                  <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                    Empty
                  </div>
                ) : (
                  columnInvocations.map((invocation) => (
                    <DraggableCard
                      key={invocation.id}
                      invocation={invocation}
                      onClick={handleTaskClick}
                    />
                  ))
                )}
              </div>
            </DroppableColumn>
          );
        })}
      </div>

      {/* Create Invocation Dialog */}
      {ritualId && (
        <CreateInvocationDialog
          ritualId={ritualId}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onInvocationCreated={fetchInvocations}
        />
      )}

      {/* Task Detail Modal */}
      {ritualId && (
        <TaskDetailModal
          task={selectedTask}
          ritualId={ritualId}
          open={showTaskDetail}
          onOpenChange={setShowTaskDetail}
          onUpdate={fetchInvocations}
        />
      )}
    </div>

    {/* Drag Overlay */}
    <DragOverlay>
      {activeInvocation ? (
        <Card className="cursor-grabbing border-white/20 bg-zinc-900 p-4 opacity-80">
          <h3 className="mb-2 font-medium text-white/90">
            {activeInvocation.title}
          </h3>
          <p className="line-clamp-2 text-sm text-white/60">
            {activeInvocation.description}
          </p>
        </Card>
      ) : null}
    </DragOverlay>
  </DndContext>
  );
}
