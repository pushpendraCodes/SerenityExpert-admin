import { type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "primary" | "success" | "warning" | "danger";
}

const tones = {
  primary: "bg-primary-soft text-primary",
  success: "bg-mint text-mint-text",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
};

export function StatCard({ label, value, icon: Icon, hint, tone = "primary" }: Props) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-full ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
