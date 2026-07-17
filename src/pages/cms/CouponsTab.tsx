import { type FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import type { Coupon } from "@/types";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Field } from "@/components/ui/Input";
import { formatDate } from "@/lib/utils";

const empty = {
  code: "",
  discountType: "percentage" as "percentage" | "flat",
  discountValue: "10",
  minAmount: "0",
  maxDiscount: "0",
  usageLimit: "100",
  validFrom: "",
  validTo: "",
};

export function CouponsTab() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<Coupon[]>("/admin/coupons");
      setRows(res.data || []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      minAmount: String(c.minAmount ?? 0),
      maxDiscount: String(c.maxDiscount ?? 0),
      usageLimit: String(c.usageLimit ?? 0),
      validFrom: c.validFrom ? c.validFrom.slice(0, 10) : "",
      validTo: c.validTo ? c.validTo.slice(0, 10) : "",
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        code: form.code,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minAmount: Number(form.minAmount),
        maxDiscount: Number(form.maxDiscount),
        usageLimit: Number(form.usageLimit),
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : undefined,
        validTo: form.validTo ? new Date(form.validTo).toISOString() : undefined,
      };
      if (editing) await apiPut(`/admin/coupons/${editing._id}`, body);
      else await apiPost("/admin/coupons", body);
      setOpen(false);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Coupon) => {
    try {
      await apiDelete(`/admin/coupons/${c._id}`);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const columns: Column<Coupon>[] = [
    { key: "code", header: "Code", render: (c) => <span className="font-mono font-semibold text-ink">{c.code}</span> },
    {
      key: "discount",
      header: "Discount",
      render: (c) => (c.discountType === "percentage" ? `${c.discountValue}%` : `₹${c.discountValue}`),
    },
    { key: "usage", header: "Usage", render: (c) => `${c.usedCount ?? 0} / ${c.usageLimit ?? "∞"}` },
    { key: "valid", header: "Valid to", render: (c) => formatDate(c.validTo) },
    {
      key: "status",
      header: "Status",
      render: (c) =>
        c.isActive === false ? <Badge tone="danger">inactive</Badge> : <Badge tone="success">active</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (c) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => remove(c)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add coupon
        </Button>
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <DataTable columns={columns} rows={rows} rowKey={(c) => c._id} loading={loading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit coupon" : "New coupon"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="coupon-form" type="submit" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="coupon-form" onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code">
              <Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} required />
            </Field>
            <Field label="Type">
              <Select
                value={form.discountType}
                onChange={(e) => set("discountType", e.target.value as "percentage" | "flat")}
              >
                <option value="percentage">Percentage</option>
                <option value="flat">Flat</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount value">
              <Input
                type="number"
                value={form.discountValue}
                onChange={(e) => set("discountValue", e.target.value)}
              />
            </Field>
            <Field label="Usage limit">
              <Input
                type="number"
                value={form.usageLimit}
                onChange={(e) => set("usageLimit", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Min amount (₹)">
              <Input type="number" value={form.minAmount} onChange={(e) => set("minAmount", e.target.value)} />
            </Field>
            <Field label="Max discount (₹)">
              <Input
                type="number"
                value={form.maxDiscount}
                onChange={(e) => set("maxDiscount", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valid from">
              <Input type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} />
            </Field>
            <Field label="Valid to">
              <Input type="date" value={form.validTo} onChange={(e) => set("validTo", e.target.value)} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
