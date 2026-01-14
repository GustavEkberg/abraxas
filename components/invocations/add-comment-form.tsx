"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface AddCommentFormProps {
  onSubmit: (content: string) => Promise<void>
}

/**
 * Form for adding comments to tasks.
 */
export function AddCommentForm({ onSubmit }: AddCommentFormProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onSubmit(content)
      setContent("")
    } catch (error) {
      console.error("Failed to submit comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="min-h-[100px] resize-none border-white/10 bg-zinc-950 text-white/90 placeholder:text-white/40 focus:border-purple-500/40"
        disabled={isSubmitting}
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          className="bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </div>
    </form>
  )
}
