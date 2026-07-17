import { type FormEvent, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import type { Faq } from "@/types";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Field } from "@/components/ui/Input";

const empty = { question: "", answer: "", category: "", order: "0" };

export function FaqsTab() {
  const [rows, setRows] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<Faq[]>("/admin/faqs");
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
  const openEdit = (f: Faq) => {
    setEditing(f);
    setForm({
      question: f.question,
      answer: f.answer,
      category: f.category || "",
      order: String(f.order ?? 0),
    });
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        question: form.question,
        answer: form.answer,
        category: form.category || undefined,
        order: Number(form.order),
      };
      if (editing) await apiPut(`/admin/faqs/${editing._id}`, body);
      else await apiPost("/admin/faqs", body);
      setOpen(false);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (f: Faq) => {
    try {
      await apiDelete(`/admin/faqs/${f._id}`);
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const columns: Column<Faq>[] = [
    {
      key: "q",
      header: "Question",
      render: (f) => <span className="font-medium text-ink">{f.question}</span>,
    },
    {
      key: "a",
      header: "Answer",
      render: (f) => <span className="line-clamp-2 max-w-md text-muted">{f.answer}</span>,
    },
    { key: "cat", header: "Category", render: (f) => f.category || "—" },
    {
      key: "actions",
      header: "Actions",
      render: (f) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(f)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="danger" size="sm" onClick={() => remove(f)}>
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
          <Plus className="h-4 w-4" /> Add FAQ
        </Button>
      </div>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <DataTable columns={columns} rows={rows} rowKey={(f) => f._id} loading={loading} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit FAQ" : "New FAQ"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button form="faq-form" type="submit" loading={saving}>
              Save
            </Button>
          </>
        }
      >
        <form id="faq-form" onSubmit={submit} className="space-y-3">
          <Field label="Question">
            <Input value={form.question} onChange={(e) => set("question", e.target.value)} required />
          </Field>
          <Field label="Answer">
            <textarea
              value={form.answer}
              onChange={(e) => set("answer", e.target.value)}
              required
              rows={4}
              className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
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
