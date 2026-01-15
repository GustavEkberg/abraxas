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
import { AsciiSpark } from "@/components/ascii-spark";

interface Ritual {
  id: string;
  name: string;
  description: string | null;
  repositoryUrl: string;
}

interface Invocation {
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
    description: "Prepared for demonic rituals",
    color: "border-red-500/20",
  },
  {
    id: "ritual",
    title: "The Ritual",
    description: "Active invocations",
    color: "border-red-500/20",
  },
  {
    id: "cursed",
    title: "The Cursed",
    description: "Blocked with errors",
    color: "border-red-500/20",
  },
  {
    id: "trial",
    title: "The Trial",
    description: "Awaiting Judgement",
    color: "border-yellow-500/20",
  },
  {
    id: "vanquished",
    title: "The Vanquished",
    description: "Returned to the Void",
    color: "border-green-500/20",
  },
] as const;

// localStorage key for persisting running tasks across page refreshes
const RUNNING_TASKS_STORAGE_KEY = "abraxas_running_tasks";

/**
 * Get persisted running task IDs from localStorage
 */
function getPersistedRunningTasks(ritualId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(`${RUNNING_TASKS_STORAGE_KEY}_${ritualId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Persist running task IDs to localStorage
 */
function persistRunningTasks(ritualId: string, taskIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${RUNNING_TASKS_STORAGE_KEY}_${ritualId}`, JSON.stringify(taskIds));
  } catch (error) {
    console.warn("Failed to persist running tasks:", error);
  }
}

/**
 * Remove persisted running tasks for a ritual
 */
function clearPersistedRunningTasks(ritualId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`${RUNNING_TASKS_STORAGE_KEY}_${ritualId}`);
  } catch (error) {
    console.warn("Failed to clear persisted running tasks:", error);
  }
}

/**
 * Droppable column component for drag-and-drop.
 */
function DroppableColumn({
  id,
  color,
  children,
  style,
}: {
  id: string;
  color: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-w-[280px] flex-col border border-dashed bg-zinc-950/50 p-4 transition-colors font-mono ${isOver ? "border-red-500/40 bg-zinc-900/50" : ""
        }`}
      style={{
        borderColor: isOver
          ? undefined
          : color.replace("border-", "").replace("/", " / "),
        ...style,
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
  console.log(invocation);

  const borderColor = isExecuting
    ? "border-red-500/40 border-dashed"
    : isError
      ? "border-red-500/40 border-dashed"
      : isCompleted
        ? "border-green-500/40 border-dashed"
        : "border-white/20 border-dashed";

  const bgColor = isExecuting
    ? "bg-red-950/20"
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
      className={`relative cursor-grab p-4 transition-all duration-200 hover:border-white/30 hover:bg-zinc-800 font-mono ${borderColor} ${bgColor} ${isDragging ? "opacity-50" : ""
        }`}
    >
      {isExecuting && <AsciiSpark />}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium text-white/90">{invocation.title}</h3>
        {isExecuting && (
          <span className="text-xs text-red-400">Executing</span>
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
      <div className="mt-2 flex items-center gap-2 text-xs text-white/40">
        <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400">
          {invocation.type}
        </span>
        <span className="rounded bg-white/5 px-1.5 py-0.5">
          {invocation.model}
        </span>
        {(invocation.messageCount !== undefined && invocation.messageCount > 0) ||
         (invocation.inputTokens !== undefined && invocation.inputTokens > 0) ||
         (invocation.outputTokens !== undefined && invocation.outputTokens > 0) ? (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400">
            {invocation.messageCount || 0}m · {Math.round(((invocation.inputTokens || 0) + (invocation.outputTokens || 0)) / 1000)}k
          </span>
        ) : null}
      </div>
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
  const { addRunningTask, removeRunningTask, updateTaskMessages } = useFireIntensity();
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
  const [persistedRunningTasks, setPersistedRunningTasks] = useState<string[]>([]);

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

  // Load persisted running tasks on mount
  useEffect(() => {
    if (ritualId) {
      const persisted = getPersistedRunningTasks(ritualId);
      setPersistedRunningTasks(persisted);
    }
  }, [ritualId]);

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

  // Update selectedTask when invocations list changes
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = invocations.find(inv => inv.id === selectedTask.id);
      if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(selectedTask)) {
        setSelectedTask(updatedTask);
      }
    }
  }, [invocations, selectedTask]);

  // Sync running tasks with fire intensity context
  useEffect(() => {
    const runningInvocations = invocations.filter(
      (inv) => inv.executionState === "in_progress"
    );

    // Add any new running tasks to fire intensity with message count
    runningInvocations.forEach((inv) => {
      addRunningTask(inv.id, inv.messageCount);
    });

    // Update message counts for existing running tasks
    runningInvocations.forEach((inv) => {
      if (inv.messageCount !== undefined) {
        updateTaskMessages(inv.id, inv.messageCount);
      }
    });

    // Remove completed tasks from fire intensity and localStorage
    invocations
      .filter((inv) => inv.executionState !== "in_progress")
      .forEach((inv) => {
        removeRunningTask(inv.id);
        // Remove from persisted running tasks
        if (ritualId) {
          setPersistedRunningTasks(prev => {
            const updated = prev.filter(id => id !== inv.id);
            persistRunningTasks(ritualId, updated);
            return updated;
          });
        }
      });
  }, [invocations, addRunningTask, removeRunningTask, updateTaskMessages]);

  // Poll for running task status updates
  useEffect(() => {
    if (!ritualId) return;

    // Use both current running invocations and persisted ones to ensure immediate polling
    const currentRunningInvocations = invocations.filter(
      (inv) => inv.executionState === "in_progress"
    );
    const allRunningTaskIds = new Set([
      ...currentRunningInvocations.map(inv => inv.id),
      ...persistedRunningTasks
    ]);

    if (allRunningTaskIds.size === 0) return;

    // Poll every 10 seconds for status updates
    const pollInterval = setInterval(async () => {
      let needsRefresh = false;
      for (const taskId of allRunningTaskIds) {
        try {
          const response = await fetch(
            `/api/rituals/${ritualId}/tasks/${taskId}/status`
          );
          if (response.ok) {
            needsRefresh = true;
          }
        } catch (error) {
          console.error("Failed to poll task status:", error);
        }
      }

      if (needsRefresh) {
        // Refresh invocations to get updated status
        await fetchInvocations();
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [ritualId, invocations, persistedRunningTasks, fetchInvocations]);

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

            // Persist running task to localStorage
            setPersistedRunningTasks(prev => {
              const updated = [...prev, invocationId];
              persistRunningTasks(ritualId, updated);
              return updated;
            });

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
            className="mb-4 text-sm text-white/60 transition-colors hover:text-white/90 font-mono"
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
                {ritual.repositoryUrl.replace("https://github.com/", "")}
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="border border-dashed border-red-500 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 hover:cursor-pointer active:scale-95 font-mono"
            >
              Cast New Invocation
            </button>
          </div>
        </div>

        {/* Board Columns */}
        <div
          className="grid gap-4 overflow-x-auto"
          style={{
            gridTemplateColumns: 'repeat(5, 1fr)',
            gridTemplateRows: '1fr 1fr'
          }}
        >
          {COLUMNS.map((column) => {
            const columnInvocations = getInvocationsByStatus(column.id);

            // Define grid positions - other columns span both rows
            const gridStyles: Record<string, { gridColumn: number | string; gridRow: number | string }> = {
              abyss: { gridColumn: 1, gridRow: '1 / 3' },
              altar: { gridColumn: 2, gridRow: '1 / 3' },
              ritual: { gridColumn: 3, gridRow: '1 / 3' },
              trial: { gridColumn: 4, gridRow: 1 },
              cursed: { gridColumn: 4, gridRow: 2 },
              vanquished: { gridColumn: 5, gridRow: '1 / 3' },
            };

            return (
              <DroppableColumn
                key={column.id}
                id={column.id}
                color={column.color}
                style={gridStyles[column.id]}
              >
                {/* Column Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white/90">
                      {column.title}
                    </h2>
                    <span className="border border-dashed border-white/20 bg-white/5 px-2 py-1 text-xs text-white/60 font-mono">
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
                    <div className="border border-dashed border-white/20 p-8 text-center text-sm text-white/30 font-mono">
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
