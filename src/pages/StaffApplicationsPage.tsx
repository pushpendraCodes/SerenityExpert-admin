import { useCallback, useEffect, useState } from "react";
import { Check, X, Search } from "lucide-react";
import { apiGetPaginated, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import type { Pagination as PaginationType, User } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Field } from "@/components/ui/Input";
import { avatarFor, formatINR, userNameParts } from "@/lib/utils";

type AppStatus = "pending_payment" | "pending_review" | "approved" | "rejected";

interface StaffApplication {
  _id: string;
  userId: (User & { city?: string; state?: string; country?: string }) | string;
  status: AppStatus;
  feeAmount: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  rejectionReason?: string;
  createdAt: string;
}

function appUser(a: StaffApplication) {
  return a.userId && typeof a.userId !== "string" ? a.userId : null;
}

function statusTone(s: AppStatus): "neutral" | "success" | "danger" | "warning" {
  if (s === "approved") return "success";
  if (s === "rejected") return "danger";
  if (s === "pending_review") return "warning";
  return "neutral";
}

export function StaffApplicationsPage() {
  const [rows, setRows] = useState<StaffApplication[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | AppStatus>("pending_review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<StaffApplication | null>(null);
  const [price, setPrice] = useState("10");
  const [commission, setCommission] = useState("20");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetPaginated<StaffApplication>("/staff/applications", {
        page,
        limit: 15,
        status: status || undefined,
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

  const decide = async (approve: boolean) => {
    if (!target) return;
    setSaving(true);
    setReviewError(null);
    try {
      await apiPut(`/staff/applications/${target._id}/review`, {
        approve,
        pricePerMinute: approve ? Number(price) : undefined,
        commissionPercent: approve ? Number(commission) : undefined,
        rejectionReason: approve ? undefined : rejectionReason || "Rejected by admin",
      });
      setTarget(null);
      await load();
    } catch (e) {
      setReviewError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const syncExperts = async () => {
    setSyncing(true);
    setSyncMsg(null);
    setError(null);
    try {
      const res = await apiPost<{
        approvedApplications: number;
        expertsCreated: number;
        expertsUpdated: number;
        failed: Array<{ applicationId: string; error: string }>;
      }>("/staff/applications/sync-experts");
      const d = res.data;
      setSyncMsg(
        d
          ? `Call profiles synced: ${d.expertsCreated} created, ${d.expertsUpdated} updated` +
              (d.failed?.length ? ` (${d.failed.length} failed)` : "")
          : res.message || "Synced"
      );
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSyncing(false);
    }
  };

  const columns: Column<StaffApplication>[] = [
    {
      key: "user",
      header: "Applicant",
      render: (row) => {
        const u = appUser(row);
        const names = userNameParts(u);
        return (
          <div className="flex items-center gap-3">
            <img
              src={avatarFor(u?.name || u?.phone || "User")}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
            <div>
              <p className="font-medium text-ink">{names.real !== "—" ? names.real : names.display}</p>
              <p className="text-xs text-muted">Display: {names.display}</p>
              <p className="text-xs text-muted">{u?.phone || ""}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "location",
      header: "Location",
      render: (row) => {
        const u = appUser(row);
        const loc = [u?.city, u?.state, u?.country].filter(Boolean).join(", ");
        return <span className="text-sm text-muted">{loc || "—"}</span>;
      },
    },
    {
      key: "fee",
      header: "Fee",
      render: (row) => formatINR(row.feeAmount),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status.replace(/_/g, " ")}</Badge>,
    },
    {
      key: "created",
      header: "Applied",
      render: (row) => (
        <span className="text-xs text-muted">{new Date(row.createdAt).toLocaleString()}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) =>
        row.status === "pending_review" ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setTarget(row);
              setReviewError(null);
              setRejectionReason("");
            }}
          >
            Review
          </Button>
        ) : row.status === "approved" ? (
          <Button
            size="sm"
            variant="outline"
            loading={saving && target?._id === row._id}
            onClick={async () => {
              setTarget(row);
              setSaving(true);
              setError(null);
              try {
                await apiPut(`/staff/applications/${row._id}/review`, {
                  approve: true,
                  pricePerMinute: Number(price) || 10,
                  commissionPercent: Number(commission) || 20,
                });
                setSyncMsg("Call profile created/updated for this user");
                setTarget(null);
              } catch (e) {
                setError(getErrorMessage(e));
              } finally {
                setSaving(false);
              }
            }}
          >
            Ensure call profile
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Staff applications"
        subtitle="Approve paid call-button requests — creates Expert profile for Chat & Call"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["", "All"],
            ["pending_review", "Pending review"],
            ["pending_payment", "Pending payment"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value || "all"}
            type="button"
            onClick={() => {
              setPage(1);
              setStatus(value);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              status === value ? "bg-primary text-white" : "bg-surface text-muted"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => load()}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary"
        >
          <Search className="h-3.5 w-3.5" /> Refresh
        </button>
        <Button size="sm" variant="outline" loading={syncing} onClick={syncExperts}>
          Sync call profiles
        </Button>
      </div>

      {syncMsg && <p className="mb-3 text-sm text-mint-text">{syncMsg}</p>}
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <DataTable columns={columns} rows={rows} loading={loading} rowKey={(r) => r._id} />
      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />

      <Modal open={Boolean(target)} onClose={() => setTarget(null)} title="Review staff application">
        {target && (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Fee paid: <strong>{formatINR(target.feeAmount)}</strong>
            </p>
            <Field label="Price per minute (₹)">
              <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} />
            </Field>
            <Field label="Commission %">
              <Input
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                type="number"
                min={0}
                max={100}
              />
            </Field>
            <Field label="Rejection reason (if rejecting)">
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            {reviewError && <p className="text-sm text-danger">{reviewError}</p>}
            <div className="flex gap-2">
              <Button loading={saving} onClick={() => decide(true)} className="flex-1">
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button
                loading={saving}
                variant="danger"
                onClick={() => decide(false)}
                className="flex-1"
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
