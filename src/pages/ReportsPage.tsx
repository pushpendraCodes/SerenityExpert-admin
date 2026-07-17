import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { apiGetPaginated, apiPut, getErrorMessage } from "@/lib/api";
import type { Pagination as PaginationType, Report, ReportStatus } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Field } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";

export function ReportsPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | ReportStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<Report | null>(null);
  const [resolveStatus, setResolveStatus] = useState<"reviewed" | "resolved">("resolved");
  const [action, setAction] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetPaginated<Report>("/admin/reports", {
        page,
        limit: 20,
        status,
      });
      setRows(res.data || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    try {
      await apiPut(`/admin/reports/${target._id}`, { status: resolveStatus, action });
      setTarget(null);
      setAction("");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Report>[] = [
    {
      key: "target",
      header: "Target",
      render: (r) => (
        <div>
          <Badge tone="neutral">{r.targetType}</Badge>
          <p className="mt-1 text-xs text-muted">{r.targetId}</p>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => (
        <div className="max-w-xs">
          <p className="font-medium text-ink">{r.reason}</p>
          {r.description && <p className="line-clamp-2 text-xs text-muted">{r.description}</p>}
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
    { key: "date", header: "Reported", render: (r) => formatDateTime(r.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Button
          variant="outline"
          size="sm"
          disabled={r.status === "resolved"}
          onClick={() => {
            setTarget(r);
            setResolveStatus("resolved");
            setAction("");
          }}
        >
          Resolve
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Reports" subtitle="Queue of user-flagged content and accounts" />

      <div className="mb-4 flex rounded-xl border border-border bg-white p-1">
        {([
          { v: "pending", l: "Pending" },
          { v: "reviewed", l: "Reviewed" },
          { v: "resolved", l: "Resolved" },
          { v: "", l: "All" },
        ] as const).map((opt) => (
          <button
            key={opt.v}
            onClick={() => {
              setStatus(opt.v);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              status === opt.v ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
            }`}
          >
            {opt.l}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r._id}
        loading={loading}
        emptyText="No reports in this queue"
      />
      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Resolve report"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button form="resolve-form" type="submit" loading={saving}>
              <Check className="h-4 w-4" /> Save
            </Button>
          </>
        }
      >
        <form id="resolve-form" onSubmit={submit} className="space-y-4">
          <Field label="Outcome">
            <Select
              value={resolveStatus}
              onChange={(e) => setResolveStatus(e.target.value as "reviewed" | "resolved")}
            >
              <option value="resolved">Resolved</option>
              <option value="reviewed">Reviewed</option>
            </Select>
          </Field>
          <Field label="Action taken">
            <Input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. Content removed, user warned"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
