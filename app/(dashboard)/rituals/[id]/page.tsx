"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"

interface Ritual {
  id: string
  name: string
  description: string | null
  repositoryPath: string
}

interface Task {
  id: string
  title: string
  description: string
  status: string
  priority: string | null
  executionState: string
  createdAt: Date
}

const COLUMNS = [
  {
    id: "abyss",
    title: "The Abyss",
    description: "Tasks waiting in darkness",
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
    description: "Active execution",
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
] as const

/**
 * Ritual board view with six mystical columns.
 * Displays all tasks organized by their status.
 */
export default function RitualBoardPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const [ritual, setRitual] = useState<Ritual | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRitual()
    fetchTasks()
  }, [params.id])

  const fetchRitual = async () => {
    try {
      const response = await fetch(`/api/rituals/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setRitual(data)
      } else if (response.status === 404) {
        router.push("/")
      }
    } catch (error) {
      console.error("Failed to fetch ritual:", error)
    }
  }

  const fetchTasks = async () => {
    try {
      // TODO: Implement tasks API endpoint
      // const response = await fetch(`/api/rituals/${params.id}/tasks`)
      // if (response.ok) {
      //   const data = await response.json()
      //   setTasks(data)
      // }
      setTasks([]) // Empty for now
    } catch (error) {
      console.error("Failed to fetch tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status)
  }

  if (loading || !ritual) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/40">Channeling the ritual...</div>
      </div>
    )
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
          <button className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-purple-700 active:scale-95">
            Invoke New Task
          </button>
        </div>
      </div>

      {/* Board Columns */}
      <div className="grid grid-cols-6 gap-4 overflow-x-auto">
        {COLUMNS.map((column) => {
          const columnTasks = getTasksByStatus(column.id)

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
                    {columnTasks.length}
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {column.description}
                </p>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-3">
                {columnTasks.length === 0 ? (
                  <div className="rounded-md border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
                    Empty
                  </div>
                ) : (
                  columnTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="cursor-pointer border-white/10 bg-zinc-900 p-4 transition-all duration-200 hover:border-white/20 hover:bg-zinc-800"
                    >
                      <h3 className="mb-2 font-medium text-white/90">
                        {task.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-white/60">
                        {task.description}
                      </p>
                      {task.priority && (
                        <div className="mt-2">
                          <span className="rounded-full bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
                            {task.priority}
                          </span>
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
