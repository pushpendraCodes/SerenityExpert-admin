import { useCallback, useEffect, useState } from "react";
import { Banknote, PlayCircle, IndianRupee, Percent, Wallet, Undo2 } from "lucide-react";
import { apiGet, apiGetPaginated, apiPost, getErrorMessage } from "@/lib/api";
import type { CommissionReport, Pagination as PaginationType, Payout } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { expertName, formatDate, formatINR } from "@/lib/utils";

type Period = "week" | "month" | "year";

export function PayoutsPage() {
  const [rows, setRows] = useState<Payout[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [report, setReport] = useState<CommissionReport | null>(null);
  const [period, setPeriod] = useState<Period>("month");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetPaginated<Payout>("/admin/payouts", { page, limit: 20 });
      setRows(res.data || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page]);

  const loadReport = useCallback(async () => {
    try {
      const res = await apiGet<CommissionReport>("/admin/commission-report", { period });
      setReport(res.data || null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const runBatch = async () => {
    setProcessing(true);
    setNotice(null);
    setError(null);
    try {
      const res = await apiPost<{ processed: number }>("/admin/payouts/process");
      const count = res.data?.processed ?? 0;
      setNotice(
        count > 0
          ? `Processed ${count} new payout(s).`
          : "No new payouts — all experts are already settled for unpaid earnings."
      );
      setPage(1);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  const columns: Column<Payout>[] = [
    { key: "expert", header: "Staff", render: (p) => expertName(p.expertId) },
    { key: "amount", header: "Gross", render: (p) => formatINR(p.amount) },
    { key: "commission", header: "Commission", render: (p) => formatINR(p.commission) },
    {
      key: "net",
      header: "Net payout",
      render: (p) => <span className="font-semibold text-ink">{formatINR(p.netAmount)}</span>,
    },
    {
      key: "period",
      header: "Period",
      render: (p) => (
        <span className="text-xs text-muted">
          {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
        </span>
      ),
    },
    { key: "status", header: "Status", render: (p) => <Badge tone={statusTone(p.status)}>{p.status}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Staff Payouts"
        subtitle="Weekly auto-payouts or manual batch — already settled periods are never paid twice"
        actions={
          <Button onClick={runBatch} loading={processing}>
            <PlayCircle className="h-4 w-4" /> Run payout batch
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">Commission report</h2>
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

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross revenue" value={formatINR(report?.grossRevenue ?? 0)} icon={IndianRupee} tone="success" hint={`${report?.totalCalls ?? 0} completed calls`} />
        <StatCard label="Platform commission" value={formatINR(report?.platformCommission ?? 0)} icon={Percent} />
        <StatCard label="Staff earnings" value={formatINR(report?.expertEarnings ?? 0)} icon={Wallet} tone="warning" />
        <StatCard label="Refunds issued" value={formatINR(report?.refundsTotal ?? 0)} icon={Undo2} tone="danger" hint={`${report?.refundCount ?? 0} refunds`} />
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm text-ink-soft">
        <Banknote className="h-5 w-5 text-primary" />
        Running the batch settles all approved experts with pending earnings for the current cycle.
      </div>

      {notice && <p className="mb-3 text-sm text-mint-text">{notice}</p>}
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p._id}
        loading={loading}
        emptyText="No payouts yet"
      />
      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />
    </div>
  );
}
