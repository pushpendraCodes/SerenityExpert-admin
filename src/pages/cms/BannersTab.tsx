import { type FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import type { Banner, BannerPosition } from "@/types";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Field } from "@/components/ui/Input";

const empty = { title: "", imageUrl: "", link: "", position: "home" as BannerPosition, order: "0" };

export function BannersTab() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<Banner[]>("/admin/banners");
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
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      imageUrl: b.imageUrl,
      link: b.link || "",
      position: b.position,
      order: String(b.order ?? 0),
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        title: form.title,
        imageUrl: form.imageUrl,
        link: form.link || undefined,
        position: form.position,
        order: Number(form.order),
      };
      if (editing) await apiPut(`/admin/banners/${editing._id}`, body);
      else await apiPost("/admin/banners", body);
      setOpen(false);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: Banner) => {
    try {
      await apiDelete(`/admin/banners/${b._id}`);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const columns: Column<Banner>[] = [
    {
      key: "img",
      header: "Banner",
      render: (b) => (
        <div className="flex items-center gap-3">
          <img
            src={b.imageUrl}
            alt=""
            className="h-10 w-16 rounded-lg border border-border object-cover"
          />
          <span className="font-medium text-ink">{b.title}</span>
        </div>
      ),
    },
    { key: "position", header: "Position", render: (b) => b.position },
    { key: "order", header: "Order", render: (b) => b.order },
    {
      key: "actions",
      header: "Actions",
      render: (b) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(b)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => remove(b)}>
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
          <Plus className="h-4 w-4" /> Add banner
        </Button>
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(b) => b._id}
        loading={loading}
        emptyText="No active banners"
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit banner" : "New banner"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="banner-form" type="submit" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="banner-form" onSubmit={submit} className="space-y-3">
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </Field>
          <Field label="Image URL">
            <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} required />
          </Field>
          <Field label="Link (optional)">
            <Input value={form.link} onChange={(e) => set("link", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Position">
              <Select
                value={form.position}
                onChange={(e) => set("position", e.target.value as BannerPosition)}
              >
                <option value="home">Home</option>
                <option value="expert_list">Expert list</option>
                <option value="community">Community</option>
              </Select>
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
