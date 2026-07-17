import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface text-ink-soft border border-border",
  success: "bg-mint text-mint-text",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-primary-soft text-primary",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

/** Map common status strings to a tone */
export function statusTone(status?: string): Tone {
  switch (status) {
    case "active":
    case "completed":
    case "online":
    case "approved":
    case "resolved":
      return "success";
    case "pending":
    case "ringing":
    case "processing":
    case "reviewed":
      return "warning";
    case "failed":
    case "rejected":
    case "missed":
    case "blocked":
    case "offline":
      return "danger";
    case "busy":
      return "info";
    default:
      return "neutral";
  }
}
