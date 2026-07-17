import { useCallback, useEffect, useState } from "react";
import { Trash2, Flag, ShieldAlert, ShieldCheck, Sparkles } from "lucide-react";
import { apiDelete, apiGetPaginated, apiPost, apiPut, getErrorMessage } from "@/lib/api";
import type { CommunityQuestion, ModerationResult, Pagination as PaginationType } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

type Filter = "" | "flagged" | "moderated" | "deleted" | "clean";

const FILTERS: { v: Filter; l: string }[] = [
  { v: "", l: "All" },
  { v: "flagged", l: "Flagged" },
  { v: "moderated", l: "AI-checked" },
  { v: "clean", l: "Clean" },
  { v: "deleted", l: "Removed" },
];

export function CommunityPage() {
  const [rows, setRows] = useState<CommunityQuestion[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<Filter>("flagged");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<Record<string, ModerationResult>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetPaginated<CommunityQuestion>("/admin/community", {
        page,
        limit: 20,
        filter,
      });
      setRows(res.data || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (id: string, p: Partial<CommunityQuestion>) =>
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...p } : r)));

  const moderate = async (q: CommunityQuestion, body: Partial<CommunityQuestion>) => {
    setBusy(q._id);
    try {
      await apiPut(`/admin/community/questions/${q._id}/moderate`, body);
      patch(q._id, body);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const removeQuestion = async (q: CommunityQuestion) => {
    setBusy(q._id);
    try {
      await apiDelete(`/admin/community/questions/${q._id}`);
      patch(q._id, { isDeleted: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const runAi = async (q: CommunityQuestion) => {
    setBusy(q._id);
    try {
      const res = await apiPost<{ question: CommunityQuestion; moderation: ModerationResult }>(
        `/admin/community/questions/${q._id}/ai-check`
      );
      if (res.data) {
        patch(q._id, {
          isModerated: res.data.question.isModerated,
          isFlagged: res.data.question.isFlagged,
        });
        setAiResult((prev) => ({ ...prev, [q._id]: res.data!.moderation }));
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const columns: Column<CommunityQuestion>[] = [
    {
      key: "q",
      header: "Question",
      render: (q) => (
        <div className="max-w-md">
          <p className="line-clamp-1 font-medium text-ink">{q.title || q.body || "—"}</p>
          <p className="line-clamp-1 text-xs text-muted">{q.body}</p>
          {aiResult[q._id] && (
            <p className="mt-1 text-xs text-warning">
              AI: {aiResult[q._id].isFlagged ? "flagged" : "clean"}
              {aiResult[q._id].reason ? ` — ${aiResult[q._id].reason}` : ""} (
              {Math.round((aiResult[q._id].confidence || 0) * 100)}%)
            </p>
          )}
        </div>
      ),
    },
    { key: "author", header: "Author", render: (q) => q.authorName || "Anonymous" },
    {
      key: "flags",
      header: "Flags",
      render: (q) => (
        <div className="flex flex-wrap gap-1">
          {q.isDeleted && <Badge tone="danger">removed</Badge>}
          {q.isFlagged && (
            <Badge tone="warning">
              <Flag className="h-3 w-3" /> flagged
            </Badge>
          )}
          {q.isModerated && (
            <Badge tone="info">
              <ShieldAlert className="h-3 w-3" /> AI
            </Badge>
          )}
          {!q.isDeleted && !q.isFlagged && !q.isModerated && <Badge tone="success">clean</Badge>}
        </div>
      ),
    },
    { key: "date", header: "Posted", render: (q) => formatDateTime(q.createdAt) },
    {
      key: "actions",
      header: "Actions",
      render: (q) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" loading={busy === q._id} onClick={() => runAi(q)}>
            <Sparkles className="h-4 w-4" /> AI check
          </Button>
          {q.isFlagged ? (
            <Button
              variant="success"
              size="sm"
              loading={busy === q._id}
              onClick={() => moderate(q, { isFlagged: false })}
            >
              <ShieldCheck className="h-4 w-4" /> Approve
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              loading={busy === q._id}
              onClick={() => moderate(q, { isFlagged: true })}
            >
              <Flag className="h-4 w-4" /> Flag
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            disabled={q.isDeleted}
            loading={busy === q._id}
            onClick={() => removeQuestion(q)}
          >
            <Trash2 className="h-4 w-4" /> Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Community Moderation"
        subtitle="Review AI-flagged content and handle the moderation queue"
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-border bg-white p-1">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => {
              setFilter(f.v);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f.v ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
            }`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(q) => q._id}
        loading={loading}
        emptyText="Nothing in this queue"
      />
      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />
    </div>
  );
}
