import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { apiGetPaginated, apiPost, getErrorMessage } from "@/lib/api";
import type { Pagination as PaginationType, Transaction, TransactionType, User } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Field } from "@/components/ui/Input";
import { formatDateTime, formatINR, userName } from "@/lib/utils";

const TYPES: TransactionType[] = ["recharge", "deduction", "refund", "payout", "adjustment"];

const typeTone: Record<TransactionType, "success" | "danger" | "info" | "warning" | "neutral"> = {
  recharge: "success",
  deduction: "danger",
  refund: "info",
  payout: "warning",
  adjustment: "neutral",
};

export function TransactionsPage() {
  const [rows, setRows] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [refundTx, setRefundTx] = useState<Transaction | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetPaginated<Transaction>("/admin/transactions", {
        page,
        limit: 20,
        type,
      });
      setRows(res.data || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, type]);

  useEffect(() => {
    load();
  }, [load]);

  const openRefund = (t: Transaction) => {
    setRefundTx(t);
    setAmount(String(t.amount));
    setDescription(`Refund for transaction ${t._id}`);
  };

  const userIdOf = (ref: string | User): string =>
    typeof ref === "string" ? ref : ref._id;

  const submitRefund = async (e: FormEvent) => {
    e.preventDefault();
    if (!refundTx) return;
    setSaving(true);
    setNotice(null);
    try {
      await apiPost("/admin/refunds", {
        userId: userIdOf(refundTx.userId),
        amount: Number(amount),
        description,
        callId: refundTx.referenceType === "call" ? refundTx.referenceId : undefined,
      });
      setRefundTx(null);
      setNotice("Refund issued successfully.");
      load();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Transaction>[] = [
    { key: "user", header: "User", render: (t) => userName(t.userId) },
    {
      key: "type",
      header: "Type",
      render: (t) => <Badge tone={typeTone[t.type]}>{t.type}</Badge>,
    },
    {
      key: "amount",
      header: "Amount",
      render: (t) => (
        <span className={t.type === "deduction" ? "font-medium text-danger" : "font-medium text-ink"}>
          {t.type === "deduction" ? "-" : "+"}
          {formatINR(t.amount)}
        </span>
      ),
    },
    { key: "balanceAfter", header: "Balance after", render: (t) => formatINR(t.balanceAfter) },
    { key: "status", header: "Status", render: (t) => <Badge tone={statusTone(t.status)}>{t.status}</Badge> },
    {
      key: "desc",
      header: "Description",
      render: (t) => <span className="text-muted">{t.description || "—"}</span>,
    },
    { key: "date", header: "Date", render: (t) => formatDateTime(t.createdAt) },
    {
      key: "actions",
      header: "",
      render: (t) => (
        <Button variant="outline" size="sm" onClick={() => openRefund(t)}>
          <Undo2 className="h-4 w-4" /> Refund
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Full audit trail of money moving through the platform" />

      <div className="mb-4 flex gap-2">
        <Select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">
              {t}
            </option>
          ))}
        </Select>
      </div>

      {notice && <p className="mb-3 text-sm text-mint-text">{notice}</p>}
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <DataTable columns={columns} rows={rows} rowKey={(t) => t._id} loading={loading} />
      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />

      <Modal
        open={!!refundTx}
        onClose={() => setRefundTx(null)}
        title={`Issue refund — ${userName(refundTx?.userId)}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefundTx(null)}>
              Cancel
            </Button>
            <Button form="refund-form" type="submit" loading={saving}>
              <Undo2 className="h-4 w-4" /> Issue refund
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Credits the user's wallet and records a <strong>refund</strong> transaction.
        </p>
        <form id="refund-form" onSubmit={submitRefund} className="space-y-4">
          <Field label="Amount (₹)">
            <Input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Reason / description">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={3}
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
