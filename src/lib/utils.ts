import type { Expert, User } from "@/types";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatINR(amount = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value = 0) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDuration(seconds = 0) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatDate(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date?: string) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (phone.startsWith("+")) return phone;
  return `+${digits}`;
}

/** Resolve a possibly-populated user ref to a display name */
export function userName(ref: User | string | undefined | null): string {
  if (!ref) return "—";
  if (typeof ref === "string") return "—";
  return ref.name || "—";
}

/** Resolve an expert ref (possibly populated with a nested user) to a display name */
export function expertName(ref: Expert | string | undefined | null): string {
  if (!ref || typeof ref === "string") return "—";
  const u = ref.userId;
  if (u && typeof u !== "string") return u.name || "—";
  return "—";
}

export function avatarFor(seed: string | undefined) {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed || "admin"}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
}
