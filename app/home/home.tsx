// =========================================================
// home.tsx
// "Grind & Co." coffee shop admin dashboard
//
// Dependencies:
//   npm install lucide-react
// Tailwind must be configured in the host project (this uses
// utility classes for layout/spacing; colors/fonts come from vars.js).
//
// Data source: real sales_data (from sales-summary.json) is passed
// in as a prop from page.tsx and transformed via toBranchData() —
// BRANCH_DATA mock has been removed from vars.js.
// =========================================================

"use client"
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/sidebar"
import {
  Sparkles,
  ChevronDown,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Search
} from "lucide-react";
import { Cookie } from "next/font/google";

const cookie = Cookie ({
  variable: "--font-cookie",
  subsets: ["latin"],
  weight: "400",
});

import {
  COLORS,
  FONTS,
  BRANCHES,
  BEST_SELLER_TABS,
} from "../vars";
import { toBranchData, TransformedBranchData } from "../../lib/transformSalesData";
import type { SalesSummary } from "../../lib/sales";
import RevenueChart from "../../components/revenuechart";


function formatMoney(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ---------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------
function Header({ userName, lastUpdated }: { userName: string; lastUpdated?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = () => {
    router.push("/llmsummary");
  };

  return (
    <div className={`mb-6 flex flex-wrap items-start justify-between gap-4 ${cookie.variable}`}>
      <div className="min-w-[180px] shrink-0">
        <h1 className="whitespace-nowrap text-xl font-semibold text-white sm:text-2xl">
          Welcome,{" "}
            <span
            style={{ color: COLORS.accent }}
              className={`${cookie.className} text-[28px] tracking-wide sm:text-3xl md:text-3xl lg:text-4xl`}
            >
              Asfar
            </span>
          </h1>
        <p className="mt-1 whitespace-nowrap text-xs sm:text-sm" style={{ color: COLORS.textSecondary }}>
          Here&rsquo;s your coffee shop&rsquo;s performance overview
        </p>
      </div>

      <div className="flex flex-1 flex-col items-end gap-1.5">
        <div className="flex w-full items-center justify-end gap-3">
          <div
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-4 py-2 text-sm sm:max-w-xs"
            style={{ backgroundColor: COLORS.bgInput, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}
          >
            <Sparkles size={16} className="shrink-0" style={{ color: COLORS.accent }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder={isFocused ? "type something..." : "Ask Grind AI anything"}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-current"
              style={{ color: COLORS.textPrimary }}
            />
            <button
              type="button"
              onClick={handleSearch}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              aria-label="Search"
            >
              <Search size={14} style={{ color: COLORS.accent }} />
            </button>
          </div>
          <div
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-black"
          style={{ backgroundColor: COLORS.accentSoft }}
        >
          <img
            src="/profile.png"
            alt="Profile"
            className="h-full w-full object-cover scale-110"
          />
        </div>
        </div>

        {lastUpdated && (
          <span className="pr-1 text-xs" style={{ color: COLORS.textTertiary }}>
            Last Updated: {lastUpdated}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Branch selector
// ---------------------------------------------------------------------
function BranchSelector({
  activeBranch,
  onSelect,
}: {
  activeBranch: string;
  onSelect: (branch: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      {BRANCHES.map((branch) => {
        const isActive = branch === activeBranch;
        return (
          <button
            key={branch}
            onClick={() => onSelect(branch)}
            className="rounded-full px-5 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: isActive ? COLORS.accentSoft : COLORS.bgPill,
              color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
              border: `1px solid ${isActive ? COLORS.accentSoft : COLORS.border}`,
            }}
          >
            {branch}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------
// Total annual revenue card
// ---------------------------------------------------------------------
function RevenueCard({ revenue, tag }: { revenue: number; tag: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>
          Total Annual Revenue
        </span>
        <div
          className="flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}
        >
          {tag} <ChevronDown size={14} />
        </div>
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full blur-3xl"
        style={{ backgroundColor: COLORS.accentGlow }}
      />

      <div className="relative flex flex-wrap items-end gap-2">
        <span className="font-bold text-white" style={{ fontSize: "clamp(1.4rem, 2.4vw, 1.875rem)" }}>
          $ {formatMoney(revenue)}
        </span>
        <span className="mb-1 text-2xl">🫘</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// "Grow smarter with data" promo card
// ---------------------------------------------------------------------
function InsightsPromoCard() {
  const router = useRouter();

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: COLORS.accentGlow }}
      />
      <h3 className="relative text-lg font-semibold text-white">Grow Smarter With Data</h3>
      <p className="relative mt-2 max-w-xs text-sm" style={{ color: COLORS.textSecondary }}>
        AI-driven insights across all 3 branches, tailored to your sales patterns.
      </p>
      <button
        onClick={() => router.push("/analytics")}
        className="relative mt-5 rounded-full px-5 py-2.5 text-sm font-semibold text-white"
        style={{ background: `linear-gradient(135deg, ${COLORS.gradientStart}, ${COLORS.gradientEnd})` }}
      >
        View Insights
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// Best sellers card
// ---------------------------------------------------------------------
function BestSellersCard({ items }: { items: TransformedBranchData["Downtown"]["bestSellers"] }) {
  const [tab, setTab] = useState<string>(BEST_SELLER_TABS[0]);

  const activeItems = (items as Record<string, (typeof items)["This Week"]>)[tab] ?? [];

  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Best Sellers</h3>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {BEST_SELLER_TABS.map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium hover:border-zinc-500"
              style={{
                backgroundColor: isActive ? COLORS.accentSoft : COLORS.bgPill,
                color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                borderColor: "transparent",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4">
        {activeItems.length === 0 ? (
          <div className="text-sm" style={{ color: COLORS.textSecondary }}>
            No data for {tab.toLowerCase()} yet.
          </div>
        ) : (
          activeItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                  style={{ backgroundColor: COLORS.bgPill }}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{item.name}</div>
                  <div className="text-xs" style={{ color: COLORS.textAccent }}>
                    {item.category}
                  </div>
                </div>
              </div>
              <div className="shrink-0 whitespace-nowrap text-right">
                <div className="text-sm font-medium text-white">
                  {item.sold.toLocaleString()} sold
                </div>
                <div
                  className="flex items-center justify-end gap-1 text-xs"
                  style={{ color: item.change >= 0 ? COLORS.positive : COLORS.negative }}
                >
                  {item.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {item.change >= 0 ? "+" : ""}
                  {item.change}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Today's snapshot card
// ---------------------------------------------------------------------
function SnapshotTile({
  icon,
  label,
  value,
  change,
}: {
  icon: string;
  label: string;
  value: string;
  change: number;
}) {
  return (
    <div
      className="min-w-0 rounded-xl p-4"
      style={{ backgroundColor: COLORS.bgCardAlt, border: `1px solid ${COLORS.border}` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
          style={{ backgroundColor: COLORS.accentSoft }}
        >
          {icon}
        </div>
        <span className="truncate text-xs" style={{ color: COLORS.textSecondary }}>
          {label}
        </span>
      </div>
      <div
        className="truncate font-bold text-white"
        style={{ fontSize: "clamp(1rem, 1.6vw, 1.25rem)" }}
      >
        {value}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1 text-xs" style={{ color: COLORS.positive }}>
        <ArrowUpRight size={12} />
        {change}% <span style={{ color: COLORS.textTertiary }}>vs yesterday</span>
      </div>
    </div>
  );
}

function SnapshotCard({ snapshot }: { snapshot: TransformedBranchData["Downtown"]["snapshot"] }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Today&rsquo;s Snapshot</h3>
        <button
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: COLORS.textSecondary }}
        >
          See all <ArrowUpRight size={12} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SnapshotTile
          icon="💳"
          label="Today's Revenue"
          value={`$ ${formatMoney(snapshot.revenue.value)}`}
          change={snapshot.revenue.change}
        />
        <SnapshotTile
          icon="🛒"
          label="Today's Sales"
          value={`${snapshot.sales.value} ${snapshot.sales.suffix}`}
          change={snapshot.sales.change}
        />
        <SnapshotTile
          icon="📦"
          label="Items Sold"
          value={`$ ${formatMoney(snapshot.profit.value)}`}
          change={snapshot.profit.change}
        />
        <SnapshotTile
          icon="📊"
          label="Avg. Order Value"
          value={`$ ${snapshot.avgOrderValue.value.toFixed(2)}`}
          change={snapshot.avgOrderValue.change}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

export default function Home({ sales_data }: { sales_data: SalesSummary }) {

  const [activeBranch, setActiveBranch] = useState<string>(BRANCHES[0]);

  const branchData = useMemo(() => toBranchData(sales_data), [sales_data]);
  const data = branchData.branches[activeBranch as keyof typeof branchData.branches];

  return (
      <div
          className="flex h-screen w-full flex-col overflow-hidden md:flex-row"
          style={{ backgroundColor: COLORS.bgApp, fontFamily: FONTS.family }}
        >
          <Sidebar />
          <main className="readme-scroll-area h-full min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="home-fade-in" style={{ animationDelay: "0ms" }}>
          <Header userName="Asfar" lastUpdated={branchData.generatedAt}/>
        </div>

        <div className="home-fade-in" style={{ animationDelay: "70ms" }}>
          <BranchSelector activeBranch={activeBranch} onSelect={setActiveBranch} />
        </div>

        <div
          className="home-fade-in mb-6 grid gap-5"
          style={{ animationDelay: "140ms", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          <div className="flex min-w-0 flex-col gap-5">
            <RevenueCard revenue={data.totalAnnualRevenue} tag={data.totalAnnualRevenueTag} />
            <InsightsPromoCard />
          </div>

          <div className="min-w-0">
            <BestSellersCard items={data.bestSellers} />
          </div>

          <div className="min-w-0">
            <SnapshotCard snapshot={data.snapshot} />
          </div>
        </div>

        <div className="home-fade-in" style={{ animationDelay: "210ms" }}>
          <RevenueChart data={data.monthlyRevenue} />
        </div>
      </main>
    <style
        dangerouslySetInnerHTML={{
          __html: `
            .readme-scroll-area {
              scrollbar-width: thin;
              scrollbar-color: ${COLORS.border} transparent;
            }
            .readme-scroll-area::-webkit-scrollbar {
              width: 6px;
            }
            .readme-scroll-area::-webkit-scrollbar-track {
              background: transparent;
            }
            .readme-scroll-area::-webkit-scrollbar-thumb {
              background-color: ${COLORS.border};
              border-radius: 9999px;
            }
            .readme-scroll-area::-webkit-scrollbar-thumb:hover {
              background-color: ${COLORS.textTertiary};
            }
          `,
        }}
      />
    </div>
  );
}