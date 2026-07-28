import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  BadgeCheck,
  Wifi,
  PhoneCall,
  IndianRupee,
  Flag,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { apiGet, getErrorMessage } from "@/lib/api";
import type { AnalyticsBucket, AnalyticsData, DashboardMetrics } from "@/types";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { BarChart } from "@/components/BarChart";
import { formatINR, formatNumber } from "@/lib/utils";

type Period = "week" | "month" | "year";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function chartLabel(id: string, period: Period) {
  // Year buckets: YYYY-MM
  if (period === "year" || /^\d{4}-\d{2}$/.test(id)) {
    const [y, m] = id.split("-");
    const month = MONTHS[Number(m) - 1] || m;
    return period === "year" ? month : `${month} ${y}`;
  }
  // Day buckets: YYYY-MM-DD
  const parts = id.split("-");
  if (parts.length === 3) {
    const day = Number(parts[2]);
    const month = MONTHS[Number(parts[1]) - 1] || parts[1];
    if (period === "week") return `${day} ${month}`;
    return String(day);
  }
  return id;
}

function toPoints(
  buckets: AnalyticsBucket[] | undefined,
  field: "count" | "total" | "amount",
  period: Period
) {
  return (buckets || []).map((d) => ({
    label: chartLabel(d._id, period),
    value: Number(d[field] ?? 0),
  }));
}

function sumField(buckets: AnalyticsBucket[] | undefined, field: "count" | "total" | "amount") {
  return (buckets || []).reduce((s, d) => s + Number(d[field] ?? 0), 0);
}

export function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, a] = await Promise.all([
        apiGet<DashboardMetrics>("/admin/dashboard"),
        apiGet<AnalyticsData>("/admin/analytics", { period }),
      ]);
      setMetrics(m.data || null);
      setAnalytics(a.data || null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const charts = useMemo(
    () => [
      {
        title: "New user signups",
        color: "var(--primary)",
        data: toPoints(analytics?.userSignups, "count", period),
        total: sumField(analytics?.userSignups, "count"),
        totalLabel: (n: number) => formatNumber(n),
      },
      {
        title: "Revenue",
        color: "var(--success)",
        data: toPoints(analytics?.revenue, "total", period),
        total: sumField(analytics?.revenue, "total"),
        totalLabel: formatINR,
        valueFormatter: formatINR,
      },
      {
        title: "Completed calls",
        color: "var(--warning)",
        data: toPoints(analytics?.calls, "count", period),
        total: sumField(analytics?.calls, "count"),
        totalLabel: (n: number) => formatNumber(n),
      },
      {
        title: "Recharges",
        color: "var(--primary-dark)",
        data: toPoints(analytics?.recharges, "amount", period),
        total: sumField(analytics?.recharges, "amount"),
        totalLabel: formatINR,
        valueFormatter: formatINR,
      },
    ],
    [analytics, period]
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Platform-wide metrics and trends at a glance"
        actions={
          <Button variant="outline" size="sm" onClick={load} loading={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      />

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={formatNumber(metrics?.totalUsers ?? 0)} icon={Users} />
        <StatCard
          label="Total experts"
          value={formatNumber(metrics?.totalExperts ?? 0)}
          icon={BadgeCheck}
        />
        <StatCard
          label="Online Staffs"
          value={formatNumber(metrics?.onlineExperts ?? 0)}
          icon={Wifi}
          tone="success"
        />
        <StatCard
          label="Active calls"
          value={formatNumber(metrics?.activeCalls ?? 0)}
          icon={PhoneCall}
          tone="warning"
        />
        <StatCard
          label="Total revenue"
          value={formatINR(metrics?.totalRevenue ?? 0)}
          icon={IndianRupee}
          tone="success"
        />
        <StatCard
          label="Pending approvals"
          value={formatNumber(metrics?.pendingExpertApprovals ?? 0)}
          icon={UserCheck}
          tone="warning"
          hint="Experts awaiting review"
        />
        <StatCard
          label="Pending reports"
          value={formatNumber(metrics?.pendingReports ?? 0)}
          icon={Flag}
          tone="danger"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Analytics</h2>
          <p className="text-sm text-muted">
            Trends by {period === "year" ? "month" : "day"} for the selected range
          </p>
        </div>
        <div className="flex rounded-xl border border-border bg-white p-1">
          {(["week", "month", "year"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
                period === p ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {charts.map((c) => (
          <div key={c.title} className="card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ink">{c.title}</p>
                <p className="mt-0.5 text-xs text-muted capitalize">This {period}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-ink">{c.totalLabel(c.total)}</p>
                <p className="text-[11px] text-muted">Total</p>
              </div>
            </div>
            {loading && !analytics ? (
              <div className="h-[220px] animate-pulse rounded-xl bg-primary-soft/60" />
            ) : (
              <BarChart data={c.data} color={c.color} valueFormatter={c.valueFormatter} />
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/experts">
          <Button variant="secondary" size="sm">
            Review Staffs approvals
          </Button>
        </Link>
        <Link to="/calls">
          <Button variant="secondary" size="sm">
            Monitor live calls
          </Button>
        </Link>
        <Link to="/reports">
          <Button variant="secondary" size="sm">
            Handle reports
          </Button>
        </Link>
      </div>
    </div>
  );
}
