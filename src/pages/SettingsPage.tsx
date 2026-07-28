import { type FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { apiGet, apiPut, getErrorMessage } from "@/lib/api";
import type { PlatformSettings } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Field } from "@/components/ui/Input";

const PRICING_KEYS: { key: string; label: string; hint: string; step?: string }[] = [
  {
    key: "default_commission_percent",
    label: "Default commission (%)",
    hint: "Platform revenue share taken from each expert's earnings",
  },
  {
    key: "default_price_per_minute",
    label: "Default price / minute (₹)",
    hint: "Suggested rate applied to new experts",
  },
  { key: "min_price_per_minute", label: "Minimum price / minute (₹)", hint: "Lower pricing guardrail" },
  { key: "max_price_per_minute", label: "Maximum price / minute (₹)", hint: "Upper pricing guardrail" },
];

const STAFF_KEYS: { key: string; label: string; hint: string }[] = [
  {
    key: "staff_application_fee",
    label: "Staff one-time payment (₹)",
    hint: "Amount charged when a user activates the call button / applies to become staff",
  },
];

const RETENTION_KEYS: { key: string; label: string; hint: string }[] = [
  {
    key: "chat_retention_days",
    label: "Chat messages (days)",
    hint: "Messages older than this are deleted for users and experts. Chat images are also removed from Cloudinary.",
  },
  {
    key: "notification_retention_days",
    label: "Notifications (days)",
    hint: "Notifications older than this are deleted for users and experts.",
  },
  {
    key: "call_recording_retention_days",
    label: "Call recordings (days)",
    hint: "Recordings older than this are removed from Cloudinary and cleared from the call. Call history is kept.",
  },
];

const ALL_KEYS = [...PRICING_KEYS, ...STAFF_KEYS, ...RETENTION_KEYS];

export function SettingsPage() {
  const [values, setValues] = useState<PlatformSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiGet<PlatformSettings>("/admin/settings");
      setValues(res.data || {});
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);

    for (const k of RETENTION_KEYS) {
      const n = Number(values[k.key]);
      if (values[k.key] !== undefined && values[k.key] !== "" && (!Number.isFinite(n) || n < 1)) {
        setError(`${k.label}: enter a whole number of at least 1 day`);
        setSaving(false);
        return;
      }
    }

    const fee = Number(values.staff_application_fee);
    if (
      values.staff_application_fee !== undefined &&
      values.staff_application_fee !== "" &&
      (!Number.isFinite(fee) || fee < 0)
    ) {
      setError("Staff one-time payment: enter a valid amount (0 or more)");
      setSaving(false);
      return;
    }

    try {
      const settings = ALL_KEYS.map((k) => ({ key: k.key, value: String(values[k.key] ?? "") })).filter(
        (s) => s.value !== ""
      );
      await apiPut("/admin/settings", { settings });
      setNotice("Settings saved. Retention cleanup runs daily and uses these values.");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Commission, staff fees, pricing, and data retention rules"
      />

      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {notice && <p className="mb-3 text-sm text-mint-text">{notice}</p>}

      <form onSubmit={submit} className="max-w-2xl space-y-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-primary-soft" />
          ))
        ) : (
          <>
            <section className="card space-y-5 p-6">
              <div>
                <h2 className="text-base font-semibold text-ink">Commission & pricing</h2>
                <p className="text-sm text-muted">Rules applied when creating or approving experts</p>
              </div>
              {PRICING_KEYS.map((k) => (
                <Field key={k.key} label={k.label}>
                  <Input
                    type="number"
                    step="0.01"
                    value={values[k.key] ?? ""}
                    onChange={(e) => set(k.key, e.target.value)}
                    placeholder="Not set"
                  />
                  <span className="text-xs text-muted">{k.hint}</span>
                </Field>
              ))}
            </section>

            <section className="card space-y-5 p-6">
              <div>
                <h2 className="text-base font-semibold text-ink">Staff / call button</h2>
                <p className="text-sm text-muted">
                  One-time fee users pay to activate earning via the call button
                </p>
              </div>
              {STAFF_KEYS.map((k) => (
                <Field key={k.key} label={k.label}>
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    value={values[k.key] ?? ""}
                    onChange={(e) => set(k.key, e.target.value)}
                    placeholder="999"
                  />
                  <span className="text-xs text-muted">{k.hint}</span>
                </Field>
              ))}
            </section>

            <section className="card space-y-5 p-6">
              <div>
                <h2 className="text-base font-semibold text-ink">Data retention</h2>
                <p className="text-sm text-muted">
                  Auto-delete user and expert data after the set number of days (daily cron). Call
                  recordings and chat images are also removed from Cloudinary.
                </p>
              </div>
              {RETENTION_KEYS.map((k) => (
                <Field key={k.key} label={k.label}>
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    value={values[k.key] ?? ""}
                    onChange={(e) => set(k.key, e.target.value)}
                    placeholder="Days"
                    required
                  />
                  <span className="text-xs text-muted">{k.hint}</span>
                </Field>
              ))}
            </section>

            <div>
              <Button type="submit" loading={saving}>
                <Save className="h-4 w-4" /> Save settings
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
