import { useCallback, useEffect, useRef, useState } from "react";
import { PhoneOff, RefreshCw, Radio, PlayCircle } from "lucide-react";
import { apiGet, apiGetPaginated, apiPost, getErrorMessage } from "@/lib/api";
import type { Call, Pagination as PaginationType } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { expertName, formatDateTime, formatDuration, formatINR, userName } from "@/lib/utils";

type Mode = "live" | "history";

function elapsedSeconds(call: Call): number {
  if (call.durationSeconds) return call.durationSeconds;
  if (call.startedAt) return Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000);
  return 0;
}

export function CallsPage() {
  const [mode, setMode] = useState<Mode>("live");

  // live
  const [live, setLive] = useState<Call[]>([]);
  const [liveLoading, setLiveLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // history
  const [rows, setRows] = useState<Call[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [recordingsOnly, setRecordingsOnly] = useState(false);
  const [histLoading, setHistLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Call | null>(null);
  const [ending, setEnding] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadLive = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLiveLoading(true);
    try {
      const res = await apiGet<Call[]>("/admin/calls/live");
      setLive(res.data || []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await apiGetPaginated<Call>("/admin/calls", {
        page,
        limit: 20,
        hasRecording: recordingsOnly ? "true" : undefined,
      });
      setRows(res.data || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setHistLoading(false);
    }
  }, [page, recordingsOnly]);

  useEffect(() => {
    if (mode !== "live") {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    loadLive(true);
    const poll = setInterval(() => loadLive(false), 5000);
    timerRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      clearInterval(poll);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, loadLive]);

  useEffect(() => {
    if (mode === "history") loadHistory();
  }, [mode, loadHistory]);

  void tick; // per-second re-render for live durations

  const forceEnd = async (call: Call) => {
    setEnding(call._id);
    try {
      await apiPost(`/admin/calls/${call._id}/force-end`);
      setLive((prev) => prev.filter((c) => c._id !== call._id));
      if (detail?._id === call._id) setDetail(null);
      if (mode === "history") loadHistory();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setEnding(null);
    }
  };

  const openDetail = async (call: Call) => {
    setDetail(call);
    try {
      const res = await apiGet<Call>(`/admin/calls/${call._id}`);
      if (res.data) setDetail(res.data);
    } catch {
      /* keep the summary row */
    }
  };

  const liveColumns: Column<Call>[] = [
    { key: "user", header: "User", render: (c) => userName(c.userId) },
    { key: "expert", header: "Expert", render: (c) => expertName(c.expertId) },
    {
      key: "duration",
      header: "Duration",
      render: (c) => <span className="font-medium text-ink">{formatDuration(elapsedSeconds(c))}</span>,
    },
    {
      key: "cost",
      header: "Running cost",
      render: (c) => formatINR(c.totalCost || (elapsedSeconds(c) / 60) * c.pricePerMinute),
    },
    { key: "status", header: "Status", render: (c) => <Badge tone={statusTone(c.status)}>{c.status}</Badge> },
    {
      key: "actions",
      header: "Actions",
      render: (c) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => openDetail(c)}>
            Details
          </Button>
          <Button variant="danger" size="sm" loading={ending === c._id} onClick={() => forceEnd(c)}>
            <PhoneOff className="h-4 w-4" /> End
          </Button>
        </div>
      ),
    },
  ];

  const historyColumns: Column<Call>[] = [
    { key: "user", header: "User", render: (c) => userName(c.userId) },
    { key: "expert", header: "Expert", render: (c) => expertName(c.expertId) },
    { key: "duration", header: "Duration", render: (c) => formatDuration(c.durationSeconds) },
    { key: "cost", header: "Cost", render: (c) => formatINR(c.totalCost) },
    { key: "status", header: "Status", render: (c) => <Badge tone={statusTone(c.status)}>{c.status}</Badge> },
    { key: "date", header: "Date", render: (c) => formatDateTime(c.createdAt) },
    {
      key: "rec",
      header: "Recording",
      render: (c) =>
        c.recordingUrl ? (
          <a
            href={c.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <PlayCircle className="h-4 w-4" /> Play
          </a>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Calls"
        subtitle="Real-time oversight, recordings, and force-end controls"
        actions={
          mode === "live" ? (
            <Button variant="outline" size="sm" onClick={() => loadLive(true)} loading={liveLoading}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
          ) : (
            <Button
              variant={recordingsOnly ? "primary" : "outline"}
              size="sm"
              onClick={() => {
                setPage(1);
                setRecordingsOnly((v) => !v);
              }}
            >
              <PlayCircle className="h-4 w-4" /> Recordings only
            </Button>
          )
        }
      />

      <div className="mb-4 flex rounded-xl border border-border bg-white p-1">
        {(["live", "history"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              mode === m ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
            }`}
          >
            {m === "live" ? "Live" : "History & Recordings"}
          </button>
        ))}
      </div>

      {mode === "live" && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-sm font-medium text-mint-text">
          <Radio className="h-4 w-4 animate-pulse" /> {live.length} active call
          {live.length === 1 ? "" : "s"} · auto-refresh 5s
        </div>
      )}

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      {mode === "live" ? (
        <DataTable
          columns={liveColumns}
          rows={live}
          rowKey={(c) => c._id}
          loading={liveLoading}
          emptyText="No active calls right now"
        />
      ) : (
        <>
          <DataTable
            columns={historyColumns}
            rows={rows}
            rowKey={(c) => c._id}
            loading={histLoading}
            emptyText="No calls found"
          />
          <Pagination pagination={pagination} onPageChange={setPage} loading={histLoading} />
        </>
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Call details">
        {detail && (
          <div className="space-y-3 text-sm">
            <Row label="User" value={userName(detail.userId)} />
            <Row label="Expert" value={expertName(detail.expertId)} />
            <Row label="Status" value={detail.status} />
            <Row label="Duration" value={formatDuration(elapsedSeconds(detail))} />
            <Row label="Rate / min" value={formatINR(detail.pricePerMinute)} />
            <Row label="Running cost" value={formatINR(detail.totalCost)} />
            <Row label="Started" value={formatDateTime(detail.startedAt)} />
            <Row label="Channel" value={detail.agoraChannelName || "—"} />
            {detail.recordingUrl ? (
              <a
                href={detail.recordingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
              >
                <PlayCircle className="h-5 w-5" /> Open recording
              </a>
            ) : (
              <p className="text-muted">Recording not available</p>
            )}
            {(detail.status === "active" || detail.status === "ringing") && (
              <div className="pt-2">
                <Button
                  variant="danger"
                  onClick={() => forceEnd(detail)}
                  loading={ending === detail._id}
                >
                  <PhoneOff className="h-4 w-4" /> Force-end call
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}
