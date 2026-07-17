import { type FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import type { Category } from "@/types";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Field } from "@/components/ui/Input";

const empty = { name: "", description: "", icon: "", order: "0" };

export function CategoriesTab() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<Category[]>("/admin/categories");
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

  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description || "",
      icon: c.icon || "",
      order: String(c.order ?? 0),
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: form.name,
        description: form.description || undefined,
        icon: form.icon || undefined,
        order: Number(form.order),
      };
      if (editing) await apiPut(`/admin/categories/${editing._id}`, body);
      else await apiPost("/admin/categories", body);
      setOpen(false);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    try {
      await apiDelete(`/admin/categories/${c._id}`);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const columns: Column<Category>[] = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium text-ink">{c.name}</span> },
    { key: "slug", header: "Slug", render: (c) => <span className="text-muted">{c.slug}</span> },
    { key: "order", header: "Order", render: (c) => c.order },
    {
      key: "status",
      header: "Status",
      render: (c) =>
        c.isActive ? <Badge tone="success">active</Badge> : <Badge tone="danger">inactive</Badge>,
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
          <Plus className="h-4 w-4" /> Add category
        </Button>
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <DataTable columns={columns} rows={rows} rowKey={(c) => c._id} loading={loading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit category" : "New category"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="cat-form" type="submit" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="cat-form" onSubmit={submit} className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon (name/url)">
              <Input value={form.icon} onChange={(e) => set("icon", e.target.value)} />
            </Field>
            <Field label="Order">
              <Input type="number" value={form.order} onChange={(e) => set("order", e.target.value)} />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
