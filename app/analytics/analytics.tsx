// =========================================================
// salesanalytics.tsx
// "Grind & Co." coffee shop admin dashboard — Sales Analytics page
//
// Dependencies:
//   npm install lucide-react
// Tailwind must be configured in the host project (this uses
// utility classes for layout/spacing; colors/fonts come from vars.js).
//
// Mirrors the shell (Sidebar/Header) and design tokens/structure used
// in staff.tsx so all three pages feel like one product.
//
// Data comes from data/sales-analytics-summary.json (written by
// scripts/salesanalytics.py), loaded server-side by page.tsx via
// lib/sales-analytics.ts and passed in as the `data` prop — see
// staff.tsx / lib/staff.ts for the equivalent pattern. This file no
// longer generates mock data; it renders exactly what
// getSalesAnalyticsSummary() returns.
// =========================================================

"use client"
import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/sidebar"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Package,
  Sparkles,
  ChevronDown,
  Search,
} from "lucide-react";

import { COLORS, FONTS } from "../vars";

import type {
  SalesAnalyticsSummary,
  DailyBranchRevenue,
  SupplyOrderByMaterial,
} from "../../lib/salesanalytics";

// ---------------------------------------------------------------------
// Per-branch line/area colors — same accent language as the BranchBadge
// pills elsewhere in the product, so a branch reads as the same color
// everywhere. Branch names are read from the data itself (not a fixed
// list), so a branch with no explicit color falls back to the palette
// by position.
// ---------------------------------------------------------------------
const BRANCH_LINE_COLORS: Record<string, string> = {
  Downtown: "#F472B6",
  Uptown: "#C084FC",
  Riverside: "#5EEAD4",
};

function branchLineColor(branch: string, fallbackIndex: number) {
  return (
    BRANCH_LINE_COLORS[branch] ??
    ["#F472B6", "#C084FC", "#5EEAD4", "#FBBF24", "#A5B4FC"][fallbackIndex % 5]
  );
}

// Fixed red/green pair used for the per-branch performance bars —
// intentionally distinct from the branch line colors above, since
// these bars encode "up day" vs "down day", not branch identity.
const PERFORMANCE_COLORS = {
  up: "#4ADE80", // green — days at/above the branch's own average
  down: "#FB7185", // red — days below the branch's own average
};

function formatCurrency(value: number) {
  return `$ ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCompactCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
  return `$${value}`;
}

function formatCompactCurrencyPrecise(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}k`;
  return `$${value.toFixed(2)}`;
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLongDate(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------
// Header (mirrors staff.tsx / home.tsx)
// ---------------------------------------------------------------------
function formatUpdatedDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // en-GB gives "27 Aug 2026" — the exact "D MMM YYYY" shape wanted here,
  // independent of the other date formatters in this file (which stay en-US).
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Header({ userName, generatedAt }: { userName: string; generatedAt: string }) {
  const updated = formatUpdatedDate(generatedAt);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = () => {
    router.push("/llmsummary");
  };

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-[220px] shrink-0">
        <h1 className="whitespace-nowrap text-xl font-bold text-white sm:text-2xl">Sales Analytics</h1>
        <p className="mt-1 whitespace-nowrap text-xs sm:text-sm" style={{ color: COLORS.textSecondary }}>
          Track revenue and orders across every branch.
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

        {updated && (
          <span className="pr-1 text-xs" style={{ color: COLORS.textTertiary }}>
            Last Updated: {updated}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// KPI cards row — four cards: revenue, sales, profit, supply cost.
// ---------------------------------------------------------------------
function KpiCard({
  icon,
  label,
  value,
  deltaPct,
  invertColor = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  deltaPct: number;
  invertColor?: boolean; // true when an increase is bad (e.g. cost) — flips green/red, arrow direction stays literal
}) {
  const increased = deltaPct >= 0;
  const isGood = invertColor ? !increased : increased;
  return (
    <div
      className="min-w-[200px] flex-1 rounded-2xl px-5 py-4"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: COLORS.bgPill }}
        >
          {icon}
        </div>
        <span className="text-sm" style={{ color: COLORS.textSecondary }}>
          {label}
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold text-white">{value}</div>
      <div
        className="mt-1 flex items-center gap-1 text-xs"
        style={{ color: isGood ? COLORS.positive : COLORS.negative }}
      >
        {increased ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {increased ? "+" : ""}
        {deltaPct.toFixed(2)}% vs last 30 days
      </div>
    </div>
  );
}

function KpiRow({ data }: { data: SalesAnalyticsSummary }) {
  return (
    <div className="mb-6 flex flex-wrap gap-4">
      <KpiCard
        icon={<Wallet size={16} color={COLORS.accent} />}
        label="Total Revenue"
        value={formatCurrency(data.total_revenue)}
        deltaPct={data.revenue_scale}
      />
      <KpiCard
        icon={<TrendingUp size={16} color={COLORS.accent} />}
        label="Total Sales"
        value={data.total_sales.toLocaleString("en-US")}
        deltaPct={data.sales_scale}
      />
      <KpiCard
        icon={<PiggyBank size={16} color={COLORS.accent} />}
        label="Total Profit"
        value={formatCurrency(data.total_profit)}
        deltaPct={data.profit_scale}
      />
      <KpiCard
        icon={<Package size={16} color={COLORS.accent} />}
        label="Total Supply Cost"
        value={formatCurrency(data.total_supplycost)}
        deltaPct={data.supplycost_scale}
        invertColor
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Multi-branch revenue area chart — plain SVG (no charting lib
// dependency, consistent with the rest of this template), one filled
// area per branch, each shaded down to the ground in its own color.
// ---------------------------------------------------------------------
function RevenueByBranchChart({
  daily,
  branches,
}: {
  daily: DailyBranchRevenue[];
  branches: string[];
}) {
  const width = 640;
  const height = 300;
  const padding = { top: 20, right: 16, bottom: 28, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoveredBranch, setHoveredBranch] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Fixed top of $300 (rather than a dynamic ceiling based on the data's
  // own max) — the daily revenue values sit well under any dynamic ceiling
  // derived from the full dataset, which was squashing every point into a
  // thin band at the bottom of the chart. $300 keeps them spread across
  // the full chart height instead.
  const maxValue = 300;

  const xFor = (i: number) => padding.left + (i / Math.max(1, daily.length - 1)) * innerW;
  const yFor = (v: number) => padding.top + innerH - (v / maxValue) * innerH;
  const baselineY = padding.top + innerH;

  const linePath = (branch: string) =>
    daily
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d.revenue[branch] ?? 0).toFixed(1)}`)
      .join(" ");

  // Closes the line path down to the baseline ("the ground") so the
  // whole area under each branch's line fills in that branch's color.
  const areaPath = (branch: string) => {
    if (daily.length === 0) return "";
    const line = linePath(branch);
    const lastX = xFor(daily.length - 1);
    const firstX = xFor(0);
    return `${line} L ${lastX.toFixed(1)} ${baselineY.toFixed(1)} L ${firstX.toFixed(1)} ${baselineY.toFixed(1)} Z`;
  };

  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) => (maxValue / yTicks) * i);

  // Show roughly 6 evenly spaced x-axis date labels regardless of range length.
  const xTickIndices = useMemo(() => {
    const count = Math.min(6, daily.length);
    if (count <= 1) return [0];
    return Array.from({ length: count }, (_, i) => Math.round((i / (count - 1)) * (daily.length - 1)));
  }, [daily.length]);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!svgRef.current || daily.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = width / rect.width;
    const localX = (e.clientX - rect.left) * scaleX;
    const ratio = (localX - padding.left) / innerW;
    const idx = Math.round(ratio * (daily.length - 1));
    setHoverIndex(Math.min(daily.length - 1, Math.max(0, idx)));
  }

  const hovered = hoverIndex !== null ? daily[hoverIndex] : null;
  const tooltipX = hoverIndex !== null ? xFor(hoverIndex) : 0;

  if (daily.length === 0) {
    return (
      <div
        className="flex h-[300px] items-center justify-center text-sm"
        style={{ color: COLORS.textTertiary }}
      >
        No revenue data for this window.
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setHoverIndex(null);
        setHoveredBranch(null);
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ display: "block" }}
      >
        <defs>
          {branches.map((branch, bi) => {
            const color = branchLineColor(branch, bi);
            return (
              <linearGradient key={branch} id={`area-fill-${branch}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.38} />
                <stop offset="100%" stopColor={color} stopOpacity={0.04} />
              </linearGradient>
            );
          })}
        </defs>

        {/* gridlines */}
        {yTickValues.map((v, i) => (
          <line
            key={i}
            x1={padding.left}
            x2={width - padding.right}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke={COLORS.chartGrid}
            strokeWidth={1}
          />
        ))}

        {/* y-axis labels */}
        {yTickValues.map((v, i) => (
          <text
            key={i}
            x={padding.left - 10}
            y={yFor(v) + 4}
            textAnchor="end"
            fontSize={11}
            fill={COLORS.textTertiary}
          >
            {formatCompactCurrency(v)}
          </text>
        ))}

        {/* x-axis labels */}
        {xTickIndices.map((idx) => (
          <text
            key={idx}
            x={xFor(idx)}
            y={height - padding.bottom + 18}
            textAnchor="middle"
            fontSize={11}
            fill={COLORS.textTertiary}
          >
            {formatShortDate(daily[idx]?.date ?? "")}
          </text>
        ))}

        {/* filled area per branch, down to the ground, in that branch's color.
            Dulled when a different branch is hovered in the tooltip below. */}
        {branches.map((branch) => (
          <path
            key={`area-${branch}`}
            d={areaPath(branch)}
            fill={`url(#area-fill-${branch})`}
            stroke="none"
            style={{
              opacity: hoveredBranch === null || hoveredBranch === branch ? 1 : 0.15,
              transition: "opacity 200ms ease",
            }}
          />
        ))}

        {/* one line per branch, on top of its own fill */}
        {branches.map((branch, bi) => (
          <path
            key={`line-${branch}`}
            d={linePath(branch)}
            fill="none"
            stroke={branchLineColor(branch, bi)}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            style={{
              opacity: hoveredBranch === null || hoveredBranch === branch ? 1 : 0.15,
              transition: "opacity 200ms ease",
            }}
          />
        ))}

        {/* hover crosshair + dots */}
        {hovered && (
          <>
            <line
              x1={tooltipX}
              x2={tooltipX}
              y1={padding.top}
              y2={baselineY}
              stroke={COLORS.border}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {branches.map((branch, bi) => (
              <circle
                key={branch}
                cx={tooltipX}
                cy={yFor(hovered.revenue[branch] ?? 0)}
                r={4}
                fill={branchLineColor(branch, bi)}
                stroke={COLORS.bgApp}
                strokeWidth={2}
                style={{
                  opacity: hoveredBranch === null || hoveredBranch === branch ? 1 : 0.15,
                  transition: "opacity 200ms ease",
                }}
              />
            ))}
          </>
        )}
      </svg>

      {/* tooltip — interactive (not pointer-events-none) so hovering a
          branch row here can dull the other branches' lines/areas above */}
      {hovered && (
        <div
          className="pointer-events-auto absolute top-4 rounded-lg px-3 py-2 text-xs"
          style={{
            left: `${(tooltipX / width) * 100}%`,
            transform: "translateX(-50%)",
            backgroundColor: COLORS.bgCardAlt,
            border: `1px solid ${COLORS.border}`,
            color: COLORS.textPrimary,
            minWidth: "140px",
          }}
        >
          <div className="mb-1 font-medium" style={{ color: COLORS.textSecondary }}>
            {formatShortDate(hovered.date)}
          </div>
          {branches.map((branch, bi) => (
            <div
              key={branch}
              className="flex cursor-default items-center justify-between gap-4 rounded px-1 py-0.5"
              onMouseEnter={() => setHoveredBranch(branch)}
              onMouseLeave={() => setHoveredBranch(null)}
              style={{
                backgroundColor: hoveredBranch === branch ? COLORS.bgPill : "transparent",
                transition: "background-color 150ms ease",
              }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: branchLineColor(branch, bi) }}
                />
                {branch}
              </span>
              <span className="font-medium">{formatCompactCurrency(hovered.revenue[branch] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Profit vs Investment — two bars per branch: profit (green) and
// investment/supply cost (red), in dollar terms, straight-edged and
// joined with no gap (same paired-bar style used elsewhere on this
// page). A single signed ratio bar was always green in practice since
// profit > 0 for every branch, so this shows the two actual dollar
// amounts side by side instead.
// ---------------------------------------------------------------------
function ProfitInvestmentPanel({
  branchRevenueDetails,
  branches,
}: {
  branchRevenueDetails: Record<string, number>;
  branches: string[];
}) {
  const width = 220;
  const height = 180;
  const padding = { top: 20, right: 12, bottom: 34, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const branchStats = useMemo(() => {
    return branches.map((branch) => {
      const revenue = branchRevenueDetails[`${branch}_revenue`] ?? 0;
      const investment = branchRevenueDetails[`${branch}_supplycost`] ?? 0;
      const profit = revenue - investment;
      return { branch, profit, investment };
    });
  }, [branchRevenueDetails, branches]);

  const maxValue = Math.max(1, ...branchStats.flatMap((s) => [Math.max(s.profit, 0), s.investment]));

  const groupGap = 18;
  const barGap = 0;
  const groupWidth = branchStats.length
    ? (innerW - groupGap * (branchStats.length - 1)) / branchStats.length
    : 0;
  const barWidth = (groupWidth - barGap) / 2;

  const yFor = (v: number) => padding.top + innerH - (Math.max(v, 0) / maxValue) * innerH;
  const baselineY = padding.top + innerH;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ display: "block" }}>
        {branchStats.map((stat, i) => {
          const groupX = padding.left + i * (groupWidth + groupGap);
          const profitX = groupX;
          const investmentX = groupX + barWidth + barGap;
          const profitY = yFor(stat.profit);
          const investmentY = yFor(stat.investment);
          return (
            <g key={stat.branch}>
              <rect
                x={profitX}
                y={profitY}
                width={barWidth}
                height={Math.max(baselineY - profitY, 1)}
                fill={PERFORMANCE_COLORS.up}
                fillOpacity={0.85}
              />
              <text
                x={profitX + barWidth / 2}
                y={profitY - 6}
                textAnchor="middle"
                fontSize={9}
                fill={COLORS.textTertiary}
              >
                {formatCompactCurrencyPrecise(stat.profit)}
              </text>

              <rect
                x={investmentX}
                y={investmentY}
                width={barWidth}
                height={Math.max(baselineY - investmentY, 1)}
                fill={PERFORMANCE_COLORS.down}
                fillOpacity={0.85}
              />
              <text
                x={investmentX + barWidth / 2}
                y={investmentY - 6}
                textAnchor="middle"
                fontSize={9}
                fill={COLORS.textTertiary}
              >
                {formatCompactCurrencyPrecise(stat.investment)}
              </text>

              <text
                x={groupX + groupWidth / 2}
                y={height - padding.bottom + 18}
                textAnchor="middle"
                fontSize={9}
                fill={COLORS.textTertiary}
              >
                {stat.branch}
              </text>
            </g>
          );
        })}
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={baselineY}
          y2={baselineY}
          stroke={COLORS.chartGrid}
          strokeWidth={1}
        />
      </svg>
      <div className="mt-2 flex items-center justify-center gap-4 text-xs" style={{ color: COLORS.textSecondary }}>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PERFORMANCE_COLORS.up }} />
          Profit
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PERFORMANCE_COLORS.down }} />
          Investment
        </div>
      </div>
    </div>
  );
}

function RevenueByBranchCard({
  daily,
  branches,
  branchRevenueDetails,
}: {
  daily: DailyBranchRevenue[];
  branches: string[];
  branchRevenueDetails: Record<string, number>;
}) {
  return (
    <div
      className="mb-6 rounded-2xl p-5"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Revenue by Branch</h2>
          <p className="mt-0.5 text-xs" style={{ color: COLORS.textTertiary }}>
            Last 30 days · All branches
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {branches.map((branch, bi) => (
            <div key={branch} className="flex items-center gap-2 text-xs" style={{ color: COLORS.textSecondary }}>
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: branchLineColor(branch, bi) }}
              />
              {branch}
            </div>
          ))}
        </div>
      </div>

      {/* 65/35 split: main revenue chart takes the larger share,
          the per-branch profit ratio panel takes the rest. */}
      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 lg:basis-[65%] lg:shrink-0 lg:grow-0">
          <RevenueByBranchChart daily={daily} branches={branches} />
        </div>
        <div
          className="flex flex-col gap-2 lg:basis-[35%] lg:shrink-0 lg:grow-0 lg:border-l lg:pl-5"
          style={{ borderColor: COLORS.border }}
        >
          <div>
            <h3 className="text-sm font-medium text-white">Profit vs Investment</h3>
            <p className="mt-0.5 text-xs" style={{ color: COLORS.textTertiary }}>
              Profit and supply cost, per branch
            </p>
          </div>
          <ProfitInvestmentPanel branchRevenueDetails={branchRevenueDetails} branches={branches} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Supply orders table — one row per material, expandable on click into
// a per-supplier drill-down (name, delivery date, quantity, cost, unit)
// for every supplier that delivered that material this window.
//
// The expand/collapse animation uses the CSS grid-template-rows
// 0fr -> 1fr trick: a wrapper div is `display: grid` with a single
// track that transitions between "0fr" (collapsed) and "1fr"
// (content's natural height), and an inner `overflow-hidden` div holds
// the actual content. This animates a true "auto height" open/close
// smoothly without measuring scrollHeight in JS or pulling in an
// animation library.
// ---------------------------------------------------------------------
const COLUMNS = ["Material", "Cost", "Quantity", ""];

function SupplierDetailRow({ supplier }: { supplier: SupplyOrderByMaterial["suppliers"][number] }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-xl px-4 py-3"
      style={{ backgroundColor: COLORS.bgCardAlt }}
    >
      <div className="min-w-[160px]">
        <div className="font-medium text-white">{supplier.supplier}</div>
        <div className="text-xs" style={{ color: COLORS.textTertiary }}>
          {supplier.supplier_id}
        </div>
      </div>
      <div className="min-w-[110px] text-xs" style={{ color: COLORS.textSecondary }}>
        <div style={{ color: COLORS.textTertiary }}>Delivered</div>
        {formatLongDate(supplier.delivery_date)}
      </div>
      <div className="min-w-[110px] text-xs" style={{ color: COLORS.textSecondary }}>
        <div style={{ color: COLORS.textTertiary }}>Quantity</div>
        {supplier.quantity.toLocaleString("en-US")} {supplier.unit}
      </div>
      <div className="min-w-[90px] text-xs" style={{ color: COLORS.textSecondary }}>
        <div style={{ color: COLORS.textTertiary }}>Cost</div>
        {formatCurrency(supplier.cost)}
      </div>
    </div>
  );
}

function MaterialRow({
  order,
  isOpen,
  onToggle,
  isLast,
}: {
  order: SupplyOrderByMaterial;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        role="button"
        aria-expanded={isOpen}
        className="cursor-pointer select-none"
        style={{ borderBottom: isOpen || isLast ? "none" : `1px solid ${COLORS.border}` }}
      >
        <td className="whitespace-nowrap px-6 py-4 font-medium text-white">{order.material}</td>
        <td className="whitespace-nowrap px-6 py-4" style={{ color: COLORS.textSecondary }}>
          {formatCurrency(order.cost)}
        </td>
        <td className="whitespace-nowrap px-6 py-4" style={{ color: COLORS.textSecondary }}>
          {order.quantity.toLocaleString("en-US")} {order.unit}
        </td>
        <td className="whitespace-nowrap px-6 py-4 text-right">
          <ChevronDown
            size={16}
            className="ml-auto transition-transform duration-200"
            style={{
              color: COLORS.textTertiary,
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </td>
      </tr>
      <tr style={{ borderBottom: isLast ? "none" : `1px solid ${COLORS.border}` }}>
        <td colSpan={COLUMNS.length} className="p-0">
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-in-out"
            style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-2 px-6 pb-4 pt-1">
                {(order.suppliers ?? []).length === 0 ? (
                  <div className="py-2 text-xs" style={{ color: COLORS.textTertiary }}>
                    No supplier detail for this material.
                  </div>
                ) : (
                  (order.suppliers ?? []).map((s) => <SupplierDetailRow key={s.supplier_id} supplier={s} />)
                )}
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

function SupplyOrdersTable({ rows }: { rows: SupplyOrderByMaterial[] }) {
  const [openMaterials, setOpenMaterials] = useState<Set<string>>(new Set());

  // Highest-costing material first, lowest at the bottom.
  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.cost - a.cost), [rows]);

  function toggle(material: string) {
    setOpenMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(material)) {
        next.delete(material);
      } else {
        next.add(material);
      }
      return next;
    });
  }

  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div className="px-6 py-4">
        <h2 className="text-base font-semibold text-white">This month's supply order</h2>
        <p className="mt-0.5 text-xs" style={{ color: COLORS.textTertiary }}>
          Click a material to see every supplier that delivered it this month.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              {COLUMNS.map((col, i) => (
                <th
                  key={col || `col-${i}`}
                  className="whitespace-nowrap px-6 py-4 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: COLORS.textTertiary }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-10 text-center text-sm" style={{ color: COLORS.textTertiary }}>
                  No supply orders in this window.
                </td>
              </tr>
            ) : (
              sortedRows.map((order, i) => (
                <MaterialRow
                  key={order.material}
                  order={order}
                  isOpen={openMaterials.has(order.material)}
                  onToggle={() => toggle(order.material)}
                  isLast={i === sortedRows.length - 1}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------
export default function SalesAnalytics({ data }: { data: SalesAnalyticsSummary }) {
  // Branch names come from the data itself (daily_revenue's keys), not
  // a fixed constant — so the chart/legend/table always match whatever
  // branches actually appear in this window's data.
  const branches = useMemo(() => {
  const set = new Set<string>();
  (data?.daily_revenue ?? []).forEach((d) => Object.keys(d.revenue).forEach((b) => set.add(b)));
  return Array.from(set).sort();
  }, [data?.daily_revenue]);

  return (
    <div
          className="flex h-screen w-full flex-col overflow-hidden md:flex-row"
          style={{ backgroundColor: COLORS.bgApp, fontFamily: FONTS.family }}
        >
          <Sidebar />
          <main className="readme-scroll-area h-full min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <Header userName="Asfar" generatedAt={data.generated_at} />

        <KpiRow data={data} />

        <RevenueByBranchCard
          daily={data.daily_revenue}
          branches={branches}
          branchRevenueDetails={data.branch_revenue_details}
        />

        <SupplyOrdersTable rows={data.this_month_supply_order} />
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