import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TaskModel } from "../schemas";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getTaskModel = (task: TaskModel) => {
  switch (task) {
    default:
    case "grok-1":
      return {
        modelID: "grok-code",
        providerID: "opencode"
      };
    case "claude-sonnet-4-5":
      return {
        modelID: "claude-sonnet-4-5-20250929",
        providerID: "anthropic"
      };
    case "claude-opus-4-5":
      return {
        modelID: "claude-opus-4-5-20251101",
        providerID: "anthropic"
      };
    case "claude-haiku-4-5":
      return {
        modelID: "claude-haiku-4-5-20251001",
        providerID: "anthropic"
      };
  }
};
