"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface CreateRitualDialogProps {
  trigger?: React.ReactNode
}

/**
 * Dialog for creating a new ritual.
 * Uses mystical theming and language.
 */
export function CreateRitualDialog({ trigger }: CreateRitualDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    repositoryUrl: "",
    githubToken: "",
    agentsMdContent: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/rituals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to summon ritual")
      }

      const ritual = await response.json()

      // Reset form and close dialog
      setFormData({
        name: "",
        description: "",
        repositoryUrl: "",
        githubToken: "",
        agentsMdContent: "",
      })
      setOpen(false)

      // Navigate to the ritual board
      router.push(`/rituals/${ritual.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-red-600 hover:bg-red-700">
            Summon New Ritual
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Summon a New Ritual</DialogTitle>
          <DialogDescription>
            Bind a repository to the dark arts. Configure the mystical connection.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Ritual Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Ritual Name</Label>
            <Input
              id="name"
              placeholder="The Eternal Codebase"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              required
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Incantation (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the purpose of this unholy ritual..."
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Repository URL */}
          <div className="space-y-2">
            <Label htmlFor="repositoryUrl">Repository URL</Label>
            <Input
              id="repositoryUrl"
              placeholder="https://github.com/owner/repo"
              value={formData.repositoryUrl}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  repositoryUrl: e.target.value,
                }))
              }
              required
              disabled={loading}
            />
            <p className="text-sm text-white/40">
              GitHub repository URL (e.g., https://github.com/owner/repo)
            </p>
          </div>

          {/* GitHub Token */}
          <div className="space-y-2">
            <Label htmlFor="githubToken">GitHub Token</Label>
            <Input
              id="githubToken"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={formData.githubToken}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  githubToken: e.target.value,
                }))
              }
              required
              disabled={loading}
            />
            <p className="text-sm text-white/40">
              Personal access token with repo permissions
            </p>
          </div>

          {/* Agents MD Content */}
          <div className="space-y-2">
            <Label htmlFor="agentsMdContent">
              AGENTS.md Content (Optional)
            </Label>
            <Textarea
              id="agentsMdContent"
              placeholder="# Custom agent instructions for this ritual..."
              value={formData.agentsMdContent}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  agentsMdContent: e.target.value,
                }))
              }
              rows={4}
              disabled={loading}
              className="font-mono text-sm"
            />
            <p className="text-sm text-white/40">
              Ritual-specific instructions for the summoned agents
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Abandon
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Summoning..." : "Begin Ritual"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
