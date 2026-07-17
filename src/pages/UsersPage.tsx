import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Search, Ban, ShieldCheck, Wallet } from "lucide-react";
import { apiGetPaginated, apiPut, getErrorMessage } from "@/lib/api";
import type { Pagination as PaginationType, User } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge, statusTone } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Select, Field } from "@/components/ui/Input";
import { avatarFor, formatINR } from "@/lib/utils";

const ROLE_TABS = [
  { v: "user" as const, l: "Users" },
  { v: "expert" as const, l: "Expert" },
  { v: "admin" as const, l: "Admin" },
];

export function UsersPage() {
  const [rows, setRows] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationType | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"user" | "expert" | "admin">("user");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [walletUser, setWalletUser] = useState<User | null>(null);
  const [amount, setAmount] = useState("");
  const [walletType, setWalletType] = useState<"credit" | "debit">("credit");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiGetPaginated<User>("/admin/users", {
        page,
        limit: 15,
        search: search.trim() || undefined,
        role,
      });
      setRows(res.data || []);
      setPagination(res.pagination);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const patchUser = (id: string, patch: Partial<User>) =>
    setRows((prev) => prev.map((u) => (u._id === id ? { ...u, ...patch } : u)));

  const toggleBlock = async (u: User) => {
    const next = !u.isBlocked;
    patchUser(u._id, { isBlocked: next });
    try {
      await apiPut(`/admin/users/${u._id}`, { isBlocked: next });
    } catch (e) {
      patchUser(u._id, { isBlocked: !next });
      setError(getErrorMessage(e));
    }
  };

  const submitWallet = async (e: FormEvent) => {
    e.preventDefault();
    if (!walletUser) return;
    setSaving(true);
    try {
      const res = await apiPut<{ balanceAfter: number }>(`/admin/users/${walletUser._id}/wallet`, {
        amount: Number(amount),
        type: walletType,
        description,
      });
      patchUser(walletUser._id, { walletBalance: res.data?.balanceAfter });
      setWalletUser(null);
      setAmount("");
      setDescription("");
      setWalletType("credit");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <img src={avatarFor(u._id || u.name)} alt="" className="h-9 w-9 rounded-full bg-surface" />
          <div>
            <p className="font-semibold text-ink">{u.name}</p>
            <p className="text-xs text-muted">{u.phone || u.email || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <Badge tone={statusTone(u.role)}>{u.role}</Badge>,
    },
    {
      key: "wallet",
      header: "Wallet",
      render: (u) => <span className="font-medium text-ink">{formatINR(u.walletBalance ?? 0)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (u) =>
        u.isBlocked ? <Badge tone="danger">blocked</Badge> : <Badge tone="success">active</Badge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (u) => (
        <div className="flex items-center gap-2">
          {role === "user" && (
            <Button variant="outline" size="sm" onClick={() => setWalletUser(u)}>
              <Wallet className="h-4 w-4" /> Wallet
            </Button>
          )}
          <Button
            variant={u.isBlocked ? "success" : "danger"}
            size="sm"
            onClick={() => toggleBlock(u)}
          >
            {u.isBlocked ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            {u.isBlocked ? "Unblock" : "Block"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage accounts and wallet balances" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-border bg-white p-1">
          {ROLE_TABS.map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => {
                setRole(opt.v);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                role === opt.v ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
              }`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSearch} className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}

      <DataTable columns={columns} rows={rows} rowKey={(u) => u._id} loading={loading} />
      <Pagination pagination={pagination} onPageChange={setPage} loading={loading} />

      <Modal
        open={!!walletUser}
        onClose={() => setWalletUser(null)}
        title={`Adjust wallet — ${walletUser?.name || ""}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setWalletUser(null)}>
              Cancel
            </Button>
            <Button form="wallet-form" type="submit" loading={saving}>
              Apply adjustment
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Current balance:{" "}
          <span className="font-semibold text-ink">{formatINR(walletUser?.walletBalance ?? 0)}</span>
        </p>
        <form id="wallet-form" onSubmit={submitWallet} className="space-y-4">
          <Field label="Type">
            <Select value={walletType} onChange={(e) => setWalletType(e.target.value as "credit" | "debit")}>
              <option value="credit">Credit (add funds)</option>
              <option value="debit">Debit (remove funds)</option>
            </Select>
          </Field>
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
              placeholder="e.g. Refund for failed call"
              minLength={3}
              required
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
