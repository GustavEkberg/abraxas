"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { CreateInvocationDialog } from "@/components/invocations/create-invocation-dialog";

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
 * Ritual board view with six mystical columns.
 * Displays all invocations organized by their status.
 */
export default function RitualBoardPage({
  params,
}: {
  params: Promise<{ id: string; }>;
}) {
  const router = useRouter();
  const [ritualId, setRitualId] = useState<string | null>(null);
  const [ritual, setRitual] = useState<Ritual | null>(null);
  const [invocations, setInvocations] = useState<Invocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

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

  const getInvocationsByStatus = (status: string) => {
    return invocations.filter((invocation) => invocation.status === status);
  };

  if (loading || !ritual) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/40">Channeling the ritual...</div>
      </div>
    );
  }

  return (
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
            <div
              key={column.id}
              className="flex min-w-[280px] flex-col rounded-lg border bg-zinc-950/50 p-4"
              style={{ borderColor: column.color.replace("border-", "") }}
            >
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
                    <Card
                      key={invocation.id}
                      className="cursor-pointer border-white/10 bg-zinc-900 p-4 transition-all duration-200 hover:border-white/20 hover:bg-zinc-800"
                    >
                      <h3 className="mb-2 font-medium text-white/90">
                        {invocation.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-white/60">
                        {invocation.description}
                      </p>
                    </Card>
                  ))
                )}
              </div>
            </div>
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
    </div>
  );
}
