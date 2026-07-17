import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CategoriesTab } from "./cms/CategoriesTab";
import { FaqsTab } from "./cms/FaqsTab";
import { BannersTab } from "./cms/BannersTab";
import { CouponsTab } from "./cms/CouponsTab";

type Tab = "categories" | "faqs" | "banners" | "coupons";

const TABS: { id: Tab; label: string }[] = [
  { id: "categories", label: "Categories" },
  { id: "faqs", label: "FAQs" },
  { id: "banners", label: "Banners" },
  { id: "coupons", label: "Coupons" },
];

export function CmsPage() {
  const [tab, setTab] = useState<Tab>("categories");

  return (
    <div>
      <PageHeader title="Content Management" subtitle="Manage what users see — no developer needed" />

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-border bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "bg-primary text-white" : "text-ink-soft hover:bg-surface"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "categories" && <CategoriesTab />}
      {tab === "faqs" && <FaqsTab />}
      {tab === "banners" && <BannersTab />}
      {tab === "coupons" && <CouponsTab />}
    </div>
  );
}
