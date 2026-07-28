import { type FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import { uploadBannerMedia } from "@/lib/cloudinaryUpload";
import type { Banner, BannerPosition } from "@/types";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Field } from "@/components/ui/Input";

type MediaType = "image" | "video";

const empty = {
  title: "",
  mediaType: "video" as MediaType,
  imageUrl: "",
  videoUrl: "",
  link: "/online",
  tagline: "",
  badge: "",
  position: "home" as BannerPosition,
  order: "0",
};

export function BannersTab() {
  const [rows, setRows] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setUploadPct(null);
    setOpen(true);
  };
  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title,
      mediaType: b.mediaType || (b.videoUrl ? "video" : "image"),
      imageUrl: b.imageUrl || "",
      videoUrl: b.videoUrl || "",
      link: b.link || "",
      tagline: b.tagline || "",
      badge: b.badge || "",
      position: b.position,
      order: String(b.order ?? 0),
    });
    setUploadPct(null);
    setOpen(true);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    setUploadPct(0);
    try {
      const uploaded = await uploadBannerMedia(file, form.mediaType, setUploadPct);
      if (form.mediaType === "video") {
        setForm((f) => ({
          ...f,
          videoUrl: uploaded.url,
          imageUrl: uploaded.thumbnailUrl || f.imageUrl,
        }));
      } else {
        setForm((f) => ({ ...f, imageUrl: uploaded.url }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : getErrorMessage(e));
    } finally {
      setUploading(false);
      setUploadPct(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: form.title,
        mediaType: form.mediaType,
        imageUrl: form.imageUrl || "",
        videoUrl: form.mediaType === "video" ? form.videoUrl : undefined,
        link: form.link || undefined,
        tagline: form.tagline || undefined,
        badge: form.badge || undefined,
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
          {b.mediaType === "video" || b.videoUrl ? (
            <div className="flex h-10 w-16 items-center justify-center rounded-lg border border-border bg-surface text-[10px] font-bold uppercase text-muted">
              Video
            </div>
          ) : (
            <img
              src={b.imageUrl}
              alt=""
              className="h-10 w-16 rounded-lg border border-border object-cover"
            />
          )}
          <div>
            <p className="font-medium text-ink">{b.title}</p>
            <p className="text-xs text-muted">{b.mediaType || "image"}</p>
          </div>
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Home + video banners power the home feed ad videos on the website.
        </p>
        <Button size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" /> Add banner
        </Button>
      </div>
      {error && !open && <p className="mb-3 text-sm text-danger">{error}</p>}
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
            <Button form="banner-form" type="submit" loading={saving || uploading}>
              Save
            </Button>
          </>
        }
      >
        <form id="banner-form" onSubmit={submit} className="space-y-3">
          {error && open && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          <Field label="Title">
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Media type">
              <Select
                value={form.mediaType}
                onChange={(e) => set("mediaType", e.target.value as MediaType)}
              >
                <option value="video">Video (home feed ad)</option>
                <option value="image">Image</option>
              </Select>
            </Field>
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
          </div>

          <Field label={form.mediaType === "video" ? "Upload video" : "Upload image"}>
            <input
              ref={fileRef}
              type="file"
              accept={form.mediaType === "video" ? "video/mp4,video/webm,video/quicktime" : "image/jpeg,image/png,image/webp"}
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] || null)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4" />{" "}
              {uploading
                ? `Uploading${uploadPct != null ? ` ${uploadPct}%` : "…"}`
                : form.mediaType === "video"
                  ? "Choose video"
                  : "Choose image"}
            </Button>
            <span className="text-xs text-muted">
              {form.mediaType === "video"
                ? "MP4/WebM/MOV · max 60s · used as home feed ad video"
                : "JPEG/PNG/WebP · max 10MB"}
            </span>
          </Field>

          {form.mediaType === "video" ? (
            <Field label="Video URL">
              <Input
                value={form.videoUrl}
                onChange={(e) => set("videoUrl", e.target.value)}
                placeholder="Uploads fill this automatically"
                required
              />
            </Field>
          ) : null}

          <Field label={form.mediaType === "video" ? "Poster image URL (optional)" : "Image URL"}>
            <Input
              value={form.imageUrl}
              onChange={(e) => set("imageUrl", e.target.value)}
              placeholder={form.mediaType === "video" ? "Auto from video upload" : "https://…"}
              required={form.mediaType === "image"}
            />
          </Field>

          <Field label="Link (tap destination)">
            <Input
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="/online or https://…"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tagline (optional)">
              <Input
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="Talk live · 5 min free"
              />
            </Field>
            <Field label="Badge (optional)">
              <Input
                value={form.badge}
                onChange={(e) => set("badge", e.target.value)}
                placeholder="Free 5 min"
              />
            </Field>
          </div>
          <Field label="Order">
            <Input type="number" value={form.order} onChange={(e) => set("order", e.target.value)} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
