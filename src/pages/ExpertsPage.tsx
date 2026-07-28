import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Search, Check, X, Star, Pencil } from "lucide-react";
import { apiGet, apiGetPaginated, apiPut, getErrorMessage, getFieldErrors } from "@/lib/api";
import type { Expert, Pagination as PaginationType, PlatformSettings, User } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Field } from "@/components/ui/Input";
import { avatarFor, formatDate, formatINR, userName, userNameParts } from "@/lib/utils";

function expertUser(e: Expert): User | null {
  return e.userId && typeof e.userId !== "string" ? e.userId : null;
}

function formatAddress(u: User | null): string {
  if (!u) return "—";
  const parts = [u.city, u.state, u.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

type EditForm = {
  name: string;
  mobile: string;
  pricePerMinute: string;
  commissionPercent: string;
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  upiId: string;
};

const EMPTY_EDIT: EditForm = {
  name: "",
  mobile: "",
  pricePerMinute: "",
  commissionPercent: "",
  accountName: "",
  accountNumber: "",
  ifscCode: "",
  bankName: "",
  upiId: "",
};

export function ExpertsPage() {
  const [rows, setRows] = useState<Expert[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [approved, setApproved] = useState<"" | "pending" | "approved">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [priceLimits, setPriceLimits] = useState({ min: 5, max: 100, default: 10, commission: 20 });
  const [approveError, setApproveError] = useState<string | null>(null);

  const [target, setTarget] = useState<Expert | null>(null);
  const [price, setPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [editTarget, setEditTarget] = useState<Expert | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetPaginated<Expert>("/admin/experts", {
        page,
        limit: 15,
        search: search.trim() || undefined,
        approved: approved || undefined,
      });
      setRows(res.data || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, approved]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiGet<PlatformSettings>("/admin/settings")
      .then((res) => {
        const s = res.data || {};
        const min = Number(s.min_price_per_minute);
        const max = Number(s.max_price_per_minute);
        const def = Number(s.default_price_per_minute);
        const commissionVal = Number(s.default_commission_percent);
        setPriceLimits({
          min: Number.isFinite(min) ? min : 5,
          max: Number.isFinite(max) ? max : 100,
          default: Number.isFinite(def) ? def : 10,
          commission: Number.isFinite(commissionVal) ? commissionVal : 20,
        });
      })
      .catch(() => undefined);
  }, []);

  const priceHint = `Allowed range: ₹${priceLimits.min} – ₹${priceLimits.max} / min`;

  const openApprove = (e: Expert) => {
    setApproveError(null);
    setTarget(e);
    setPrice(String(e.pricePerMinute ?? priceLimits.default));
    setCommission(String(e.commissionPercent ?? priceLimits.commission));
    setRejectionReason("");
  };

  const decide = async (isApproved: boolean) => {
    if (!target) return;
    if (isApproved && price) {
      const p = Number(price);
      if (Number.isNaN(p) || p < priceLimits.min || p > priceLimits.max) {
        setApproveError(`Price must be between ₹${priceLimits.min} and ₹${priceLimits.max} per minute`);
        return;
      }
    }
    setSaving(true);
    setApproveError(null);
    try {
      await apiPut(`/admin/experts/${target._id}/approve`, {
        isApproved,
        rejectionReason: isApproved ? undefined : rejectionReason || "Not eligible",
        pricePerMinute: price ? Number(price) : undefined,
        commissionPercent: commission ? Number(commission) : undefined,
      });
      setTarget(null);
      load();
    } catch (e) {
      const fe = getFieldErrors(e);
      setApproveError(fe.pricePerMinute || getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const validateEdit = (f: EditForm): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!f.name.trim() || f.name.trim().length < 2) {
      errs.name = "Name must be at least 2 characters";
    }
    const priceVal = Number(f.pricePerMinute);
    if (f.pricePerMinute === "" || Number.isNaN(priceVal)) {
      errs.pricePerMinute = "Enter a valid price";
    } else if (priceVal < priceLimits.min || priceVal > priceLimits.max) {
      errs.pricePerMinute = `Price must be between ₹${priceLimits.min} and ₹${priceLimits.max} per minute`;
    }
    const commissionVal = Number(f.commissionPercent);
    if (Number.isNaN(commissionVal) || commissionVal < 0 || commissionVal > 100) {
      errs.commissionPercent = "Commission must be between 0 and 100";
    }
    return errs;
  };

  const openEdit = (e: Expert) => {
    const u = expertUser(e);
    const bank = e.bankDetails;
    setEditErrors({});
    setEditTarget(e);
    setEditForm({
      mobile: e.mobile || u?.phone || "",
      name: u?.name || "",
      pricePerMinute: String(e.pricePerMinute ?? ""),
      commissionPercent: String(e.commissionPercent ?? ""),
      accountName: bank?.accountName || "",
      accountNumber: bank?.accountNumber || "",
      ifscCode: bank?.ifscCode || "",
      bankName: bank?.bankName || "",
      upiId: bank?.upiId || "",
    });
  };

  const saveEdit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!editTarget) return;
    const errs = validateEdit(editForm);
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const bankPayload = {
        accountName: editForm.accountName.trim(),
        accountNumber: editForm.accountNumber.trim(),
        ifscCode: editForm.ifscCode.trim(),
        bankName: editForm.bankName.trim(),
        upiId: editForm.upiId.trim() || undefined,
      };
      const hasBank = Boolean(
        bankPayload.accountName ||
          bankPayload.accountNumber ||
          bankPayload.ifscCode ||
          bankPayload.bankName ||
          bankPayload.upiId
      );
      await apiPut(`/admin/experts/${editTarget._id}`, {
        name: editForm.name || undefined,
        pricePerMinute: Number(editForm.pricePerMinute),
        commissionPercent: Number(editForm.commissionPercent),
        ...(hasBank ? { bankDetails: bankPayload } : {}),
      });
      setEditTarget(null);
      setEditErrors({});
      load();
    } catch (e) {
      const fe = getFieldErrors(e);
      if (Object.keys(fe).length === 0) fe._general = getErrorMessage(e);
      setEditErrors(fe);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Expert>[] = [
    {
      key: "name",
      header: "Expert",
      render: (e) => {
        const u = expertUser(e);
        const names = userNameParts(u);
        return (
          <div className="flex items-center gap-3">
            <img
              src={avatarFor(u?._id || e._id)}
              alt=""
              className="h-9 w-9 rounded-full bg-surface"
            />
            <div>
              <p className="font-semibold text-ink">{names.real !== "—" ? names.real : names.display}</p>
              <p className="text-xs text-muted">Display: {names.display}</p>
              <p className="text-xs text-muted">{u?.phone || e.mobile || "—"}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "rate",
      header: "Rate / min",
      render: (e) => <span className="font-medium text-ink">{formatINR(e.pricePerMinute)}</span>,
    },
    {
      key: "commission",
      header: "Commission",
      render: (e) => <span>{e.commissionPercent ?? "—"}%</span>,
    },
    {
      key: "rating",
      header: "Rating",
      render: (e) => (
        <span className="inline-flex items-center gap-1">
          <Star className="h-4 w-4 fill-star text-star" /> {(e.rating ?? 0).toFixed(1)}
          <span className="text-xs text-muted">({e.totalCalls ?? 0})</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (e) =>
        e.isApproved ? (
          <Badge tone="success">approved</Badge>
        ) : (
          <Badge tone="warning">pending</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (e) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openApprove(e)}>
            Review
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
        </div>
      ),
    },
  ];

  const setEditField = (k: keyof EditForm, v: string) => {
    setEditForm((f) => ({ ...f, [k]: v }));
    setEditErrors((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle="Review applications, set rates, and manage payout bank details"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <form
          className="relative flex-1 min-w-[200px]"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by real name, display name, phone or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </form>
        <div className="flex rounded-xl border border-border bg-white p-1">
          {([
            { v: "", l: "All" },
            { v: "pending", l: "Pending" },
            { v: "approved", l: "Approved" },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              onClick={() => {
                setApproved(opt.v);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                approved === opt.v ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
        <Button
          onClick={() => {
            setPage(1);
            load();
          }}
        >
          Search
        </Button>
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <DataTable columns={columns} rows={rows} rowKey={(e) => e._id} loading={loading} />
      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={`Review — ${userName(expertUser(target || ({} as Expert))) || "Expert"}`}
        footer={
          <>
            <Button variant="danger" onClick={() => decide(false)} loading={saving}>
              <X className="h-4 w-4" /> Reject
            </Button>
            <Button variant="success" onClick={() => decide(true)} loading={saving}>
              <Check className="h-4 w-4" /> Approve
            </Button>
          </>
        }
      >
        {approveError && !approveError.toLowerCase().includes("price") && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
            {approveError}
          </p>
        )}
        {target?.bio && <p className="text-sm text-ink-soft">{target.bio}</p>}
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Price / min (₹)"
            error={approveError?.toLowerCase().includes("price") ? approveError : undefined}
          >
            <Input
              type="number"
              min={priceLimits.min}
              max={priceLimits.max}
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setApproveError(null);
              }}
            />
            <span className="text-xs text-muted">{priceHint}</span>
          </Field>
          <Field label="Commission (%)">
            <Input
              type="number"
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Rejection reason (if rejecting)">
          <Input
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Optional note shown when rejecting"
          />
        </Field>
      </Modal>

      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit — ${userName(expertUser(editTarget || ({} as Expert))) || "Expert"}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button form="edit-expert" type="submit" loading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        <form id="edit-expert" onSubmit={saveEdit} className="space-y-3" noValidate>
          {editErrors._general && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {editErrors._general}
            </p>
          )}

          {(() => {
            const u = expertUser(editTarget || ({} as Expert));
            return (
              <div className="rounded-xl border border-border bg-surface/60 p-3 space-y-2">
                <h3 className="text-sm font-bold text-ink">Staff profile</h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <p className="text-xs text-muted">Real name</p>
                    <p className="font-medium text-ink">{u?.realName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Display name</p>
                    <p className="font-medium text-ink">{u?.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Date of birth</p>
                    <p className="font-medium text-ink">{formatDate(u?.dob)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Gender</p>
                    <p className="font-medium text-ink capitalize">{u?.gender || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Email</p>
                    <p className="font-medium text-ink break-all">{u?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Mobile</p>
                    <p className="font-medium text-ink">{editForm.mobile || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted">Address</p>
                    <p className="font-medium text-ink">{formatAddress(u)}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Display name" error={editErrors.name}>
              <Input
                value={editForm.name}
                onChange={(e) => setEditField("name", e.target.value)}
              />
            </Field>
            <Field label="Mobile">
              <Input value={editForm.mobile} disabled />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price / min (₹)" error={editErrors.pricePerMinute}>
              <Input
                type="number"
                min={priceLimits.min}
                max={priceLimits.max}
                value={editForm.pricePerMinute}
                onChange={(e) => setEditField("pricePerMinute", e.target.value)}
              />
              <span className="text-xs text-muted">{priceHint}</span>
            </Field>
            <Field label="Commission (%)" error={editErrors.commissionPercent}>
              <Input
                type="number"
                value={editForm.commissionPercent}
                onChange={(e) => setEditField("commissionPercent", e.target.value)}
              />
            </Field>
          </div>

          <h3 className="pt-2 text-sm font-bold text-ink">Bank details <span className="font-normal text-muted">(optional)</span></h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account name" error={editErrors.accountName}>
              <Input
                value={editForm.accountName}
                onChange={(e) => setEditField("accountName", e.target.value)}
              />
            </Field>
            <Field label="Account number" error={editErrors.accountNumber}>
              <Input
                value={editForm.accountNumber}
                onChange={(e) => setEditField("accountNumber", e.target.value)}
              />
            </Field>
            <Field label="IFSC" error={editErrors.ifscCode}>
              <Input
                value={editForm.ifscCode}
                onChange={(e) => setEditField("ifscCode", e.target.value)}
              />
            </Field>
            <Field label="Bank name" error={editErrors.bankName}>
              <Input
                value={editForm.bankName}
                onChange={(e) => setEditField("bankName", e.target.value)}
              />
            </Field>
            <Field label="UPI ID" error={editErrors.upiId}>
              <Input
                value={editForm.upiId}
                onChange={(e) => setEditField("upiId", e.target.value)}
                placeholder="name@upi"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
