import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Search, Check, X, Plus, Star, Pencil } from "lucide-react";
import { apiGet, apiGetPaginated, apiPost, apiPut, getErrorMessage, getFieldErrors } from "@/lib/api";
import type { Category, Expert, Pagination as PaginationType, PlatformSettings, User } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Field } from "@/components/ui/Input";
import { avatarFor, formatINR, normalizePhone } from "@/lib/utils";

function expertUser(e: Expert): User | null {
  return e.userId && typeof e.userId !== "string" ? e.userId : null;
}

function categoryIds(e: Expert): string[] {
  return (e.categories || []).map((c) => (typeof c === "string" ? c : c._id));
}

const EMPTY_CREATE = {
  mobile: "",
  name: "",
  bio: "",
  experience: "1",
  languages: "English",
  pricePerMinute: "10",
  commissionPercent: "20",
};

export function ExpertsPage() {
  const [rows, setRows] = useState<Expert[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [approved, setApproved] = useState<"" | "pending" | "approved">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [priceLimits, setPriceLimits] = useState({ min: 5, max: 100, default: 10, commission: 20 });
  const [approveError, setApproveError] = useState<string | null>(null);

  // approve/reject modal
  const [target, setTarget] = useState<Expert | null>(null);
  const [price, setPrice] = useState("");
  const [commission, setCommission] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);

  // create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_CREATE);
  const [createCats, setCreateCats] = useState<string[]>([]);
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // edit modal
  const [editTarget, setEditTarget] = useState<Expert | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_CREATE);
  const [editCats, setEditCats] = useState<string[]>([]);
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
    apiGet<Category[]>("/admin/categories")
      .then((res) => setCategories(res.data || []))
      .catch(() => setCategories([]));

    apiGet<PlatformSettings>("/admin/settings")
      .then((res) => {
        const s = res.data || {};
        const min = Number(s.min_price_per_minute);
        const max = Number(s.max_price_per_minute);
        const def = Number(s.default_price_per_minute);
        const commission = Number(s.default_commission_percent);
        setPriceLimits({
          min: Number.isFinite(min) ? min : 5,
          max: Number.isFinite(max) ? max : 100,
          default: Number.isFinite(def) ? def : 10,
          commission: Number.isFinite(commission) ? commission : 20,
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

  const toggleCat = (
    id: string,
    setter: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setter((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const validateExpert = (
    f: typeof EMPTY_CREATE,
    cats: string[],
    { requireMobile }: { requireMobile: boolean }
  ): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!f.name.trim() || f.name.trim().length < 2)
      errs.name = "Name must be at least 2 characters";
    if (requireMobile && !/^\+?[1-9]\d{9,14}$/.test(normalizePhone(f.mobile)))
      errs.mobile = "Enter a valid mobile number";
    if (cats.length === 0) errs.categories = "Select at least one category";
    if (f.experience !== "" && Number(f.experience) < 0)
      errs.experience = "Experience cannot be negative";
    const price = Number(f.pricePerMinute);
    if (f.pricePerMinute === "" || Number.isNaN(price)) {
      errs.pricePerMinute = "Enter a valid price";
    } else if (price < priceLimits.min || price > priceLimits.max) {
      errs.pricePerMinute = `Price must be between ₹${priceLimits.min} and ₹${priceLimits.max} per minute`;
    }
    const commission = Number(f.commissionPercent);
    if (Number.isNaN(commission) || commission < 0 || commission > 100)
      errs.commissionPercent = "Commission must be between 0 and 100";
    return errs;
  };

  const openCreate = () => {
    setForm({
      ...EMPTY_CREATE,
      pricePerMinute: String(priceLimits.default),
      commissionPercent: String(priceLimits.commission),
    });
    setCreateCats([]);
    setCreateErrors({});
    setError(null);
    setCreateOpen(true);
  };

  const createExpert = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateExpert(form, createCats, { requireMobile: true });
    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost("/admin/experts", {
        mobile: normalizePhone(form.mobile),
        name: form.name,
        bio: form.bio || undefined,
        experience: Number(form.experience),
        categories: createCats,
        languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
        pricePerMinute: Number(form.pricePerMinute),
        commissionPercent: Number(form.commissionPercent),
      });
      setCreateOpen(false);
      setForm(EMPTY_CREATE);
      setCreateCats([]);
      setCreateErrors({});
      setPage(1);
      load();
    } catch (e) {
      const fe = getFieldErrors(e);
      if (Object.keys(fe).length === 0) fe._general = getErrorMessage(e);
      setCreateErrors(fe);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (e: Expert) => {
    const u = expertUser(e);
    setEditErrors({});
    setEditTarget(e);
    setEditForm({
      mobile: e.mobile || u?.phone || "",
      name: u?.name || "",
      bio: e.bio || "",
      experience: String(e.experience ?? 0),
      languages: (e.languages || []).join(", ") || "English",
      pricePerMinute: String(e.pricePerMinute ?? ""),
      commissionPercent: String(e.commissionPercent ?? ""),
    });
    setEditCats(categoryIds(e));
  };

  const saveEdit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!editTarget) return;
    const errs = validateExpert(editForm, editCats, { requireMobile: false });
    setEditErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      await apiPut(`/admin/experts/${editTarget._id}`, {
        name: editForm.name || undefined,
        bio: editForm.bio,
        experience: Number(editForm.experience),
        categories: editCats,
        languages: editForm.languages.split(",").map((s) => s.trim()).filter(Boolean),
        pricePerMinute: Number(editForm.pricePerMinute),
        commissionPercent: Number(editForm.commissionPercent),
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
        return (
          <div className="flex items-center gap-3">
            <img
              src={avatarFor(u?._id || e._id)}
              alt=""
              className="h-9 w-9 rounded-full bg-surface"
            />
            <div>
              <p className="font-semibold text-ink">{u?.name || "Expert"}</p>
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

  const clearErr = (setter: React.Dispatch<React.SetStateAction<Record<string, string>>>, k: string) =>
    setter((prev) => {
      if (!prev[k]) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });

  const setField = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    clearErr(setCreateErrors, k);
  };
  const setEditField = (k: keyof typeof editForm, v: string) => {
    setEditForm((f) => ({ ...f, [k]: v }));
    clearErr(setEditErrors, k);
  };

  const CategoryPicker = ({
    selected,
    onToggle,
  }: {
    selected: string[];
    onToggle: (id: string) => void;
  }) => (
    <div className="flex flex-wrap gap-2">
      {categories.length === 0 && (
        <span className="text-xs text-muted">No categories found. Add one under CMS first.</span>
      )}
      {categories.map((c) => {
        const active = selected.includes(c._id);
        return (
          <button
            key={c._id}
            type="button"
            onClick={() => onToggle(c._id)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "border-primary bg-primary text-white"
                : "border-border bg-white text-ink-soft hover:bg-surface"
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Experts"
        subtitle="Approve, verify, and manage expert accounts"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add expert
          </Button>
        }
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
            placeholder="Search by name, phone or email"
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

      {/* Review modal */}
      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title={`Review — ${expertUser(target || ({} as Expert))?.name || "Expert"}`}
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

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add new expert"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button form="create-expert" type="submit" loading={saving}>
              Create expert
            </Button>
          </>
        }
      >
        <form id="create-expert" onSubmit={createExpert} className="space-y-3" noValidate>
          {createErrors._general && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {createErrors._general}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" error={createErrors.name}>
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} />
            </Field>
            <Field label="Mobile" error={createErrors.mobile}>
              <Input value={form.mobile} onChange={(e) => setField("mobile", e.target.value)} />
            </Field>
          </div>
          <Field label="Bio" error={createErrors.bio}>
            <Input value={form.bio} onChange={(e) => setField("bio", e.target.value)} />
          </Field>
          <Field label="Categories" error={createErrors.categories}>
            <CategoryPicker
              selected={createCats}
              onToggle={(id) => {
                toggleCat(id, setCreateCats);
                clearErr(setCreateErrors, "categories");
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Experience (yrs)" error={createErrors.experience}>
              <Input
                type="number"
                value={form.experience}
                onChange={(e) => setField("experience", e.target.value)}
              />
            </Field>
            <Field label="Languages (comma-sep)" error={createErrors.languages}>
              <Input
                value={form.languages}
                onChange={(e) => setField("languages", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price / min (₹)" error={createErrors.pricePerMinute}>
              <Input
                type="number"
                min={priceLimits.min}
                max={priceLimits.max}
                value={form.pricePerMinute}
                onChange={(e) => setField("pricePerMinute", e.target.value)}
              />
              <span className="text-xs text-muted">{priceHint}</span>
            </Field>
            <Field label="Commission (%)" error={createErrors.commissionPercent}>
              <Input
                type="number"
                value={form.commissionPercent}
                onChange={(e) => setField("commissionPercent", e.target.value)}
              />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit — ${expertUser(editTarget || ({} as Expert))?.name || "Expert"}`}
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
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" error={editErrors.name}>
              <Input
                value={editForm.name}
                onChange={(e) => setEditField("name", e.target.value)}
              />
            </Field>
            <Field label="Mobile">
              <Input value={editForm.mobile} disabled />
            </Field>
          </div>
          <Field label="Bio" error={editErrors.bio}>
            <Input value={editForm.bio} onChange={(e) => setEditField("bio", e.target.value)} />
          </Field>
          <Field label="Categories" error={editErrors.categories}>
            <CategoryPicker
              selected={editCats}
              onToggle={(id) => {
                toggleCat(id, setEditCats);
                clearErr(setEditErrors, "categories");
              }}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Experience (yrs)" error={editErrors.experience}>
              <Input
                type="number"
                value={editForm.experience}
                onChange={(e) => setEditField("experience", e.target.value)}
              />
            </Field>
            <Field label="Languages (comma-sep)" error={editErrors.languages}>
              <Input
                value={editForm.languages}
                onChange={(e) => setEditField("languages", e.target.value)}
              />
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
        </form>
      </Modal>
    </div>
  );
}
