// =========================================================
// revenue-chart.tsx
// Standalone "Revenue Performance" area chart used on the
// dashboard home screen.
//
// Usage:
//   import RevenueChart from "./revenue-chart";
//   <RevenueChart data={data.monthlyRevenue} />
//
// `data` is the raw monthly_revenue array from sales-summary.json:
//   { month: 1-12, year, revenue, current_month, day: number|false }[]
//
// - Shows ONE year at a time, defaulting to the year containing the
//   current month (latest data).
// - Scroll wheel up = previous year, down = next year, bounded by
//   years present in `data`. Transitions slide smoothly; a lock
//   prevents re-triggering mid-animation.
// - Hovering a point shows THAT month's revenue/change in the
//   tooltip; un-hovering falls back to the current month.
// - Line + month labels live in the same sliding wrapper so they
//   move together during the year transition.
//
// - The current month's point is a PARTIAL month: it's positioned
//   within the (previous month -> current month) segment, moving
//   from the previous month's tick toward the current month's tick
//   as `day` advances, landing exactly on the current month's tick
//   only once the month is complete. It never bleeds into the next
//   segment (e.g. Aug -> Sep) while the month is still in progress.
// =========================================================

import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { COLORS, MONTH_LABELS } from "../app/vars";

export type MonthlyRevenuePoint = {
  month: number; // 1-12
  year: number;
  revenue: number;
  current_month: boolean;
  day: number | false;
};

export interface RevenueChartProps {
  data: MonthlyRevenuePoint[];
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

// Snaps a raw step size up to a "nice" round number (1, 2, or 5 times
// a power of 10 — e.g. 1000, 2000, 5000). Used to generate y-axis
// gridlines that are evenly spaced round numbers, instead of rounding
// each gridline independently (which can skip or duplicate values).
function niceStep(rawStep: number): number {
  if (!isFinite(rawStep) || rawStep <= 0) return 1;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, exponent);
  let niceFraction: number;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * Math.pow(10, exponent);
}

const TRANSITION_MS = 280;

export default function RevenueChart({ data }: RevenueChartProps) {
  const width = 1080;
  const height = 280;
  const padLeft = 48;
  const padRight = 16;
  const padTop = 24;
  const padBottom = 32;

  const containerRef = useRef<HTMLDivElement>(null);
  const wheelLockRef = useRef(false);

  const sortedAll = useMemo(
    () => [...data].sort((a, b) => a.year - b.year || a.month - b.month),
    [data]
  );

  const years = useMemo(
    () => Array.from(new Set(sortedAll.map((d) => d.year))).sort((a, b) => a - b),
    [sortedAll]
  );
  const minYear = years[0];
  const maxYear = years[years.length - 1];

  const currentEntry = sortedAll.find((d) => d.current_month);
  // default to the year holding the latest/current data
  const [selectedYear, setSelectedYear] = useState<number>(
    currentEntry?.year ?? maxYear ?? new Date().getFullYear()
  );

  // slide animation state: null = settled, 'out' = current content
  // sliding away, direction tracks which way it's headed
  const [slidePhase, setSlidePhase] = useState<"idle" | "out" | "in">("idle");
  const [slideDir, setSlideDir] = useState<1 | -1>(1); // 1 = next year (slide left), -1 = prev year (slide right)
  const pendingYearRef = useRef<number | null>(null);

  const goToYear = useCallback(
    (target: number, dir: 1 | -1) => {
      if (target === selectedYear || wheelLockRef.current) return;
      wheelLockRef.current = true;
      pendingYearRef.current = target;
      setSlideDir(dir);
      setSlidePhase("out");
    },
    [selectedYear]
  );

  // phase machine: 'out' finishes -> swap year, become 'in' with no
  // transition (snapped to the opposite offset) -> next frame ->
  // 'idle' animates back to translateX(0)
  useEffect(() => {
    if (slidePhase === "out") {
      const t = setTimeout(() => {
        if (pendingYearRef.current !== null) {
          setSelectedYear(pendingYearRef.current);
          pendingYearRef.current = null;
        }
        setSlidePhase("in");
      }, TRANSITION_MS);
      return () => clearTimeout(t);
    }
    if (slidePhase === "in") {
      const raf = requestAnimationFrame(() => setSlidePhase("idle"));
      return () => cancelAnimationFrame(raf);
    }
    if (slidePhase === "idle") {
      wheelLockRef.current = false;
    }
  }, [slidePhase]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (years.length <= 1) return;
      e.preventDefault();
      if (e.deltaY < 0 && selectedYear > minYear) {
        goToYear(selectedYear - 1, -1);
      } else if (e.deltaY > 0 && selectedYear < maxYear) {
        goToYear(selectedYear + 1, 1);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [years.length, minYear, maxYear, selectedYear, goToYear]);

  const yearData = useMemo(
    () => sortedAll.filter((d) => d.year === selectedYear).sort((a, b) => a.month - b.month),
    [sortedAll, selectedYear]
  );

  const { points, maxVal, yTicks, currentMonthEntry } = useMemo(() => {
    if (yearData.length === 0) {
      return {
        points: [] as (readonly [number, number, MonthlyRevenuePoint])[],
        maxVal: 0,
        yTicks: [] as number[],
        currentMonthEntry: null as MonthlyRevenuePoint | null,
      };
    }
    const dataMax = Math.max(...yearData.map((d) => d.revenue)) || 1;
    // FIX: gridlines used to be generated by taking 6 fixed fractions
    // of maxVal (0%, 20%, 40%...) and rounding EACH ONE independently
    // to the nearest 1000. That can skip a round number entirely —
    // e.g. 0.6*maxVal rounding down to 3000 while 0.8*maxVal rounds
    // up to 5000, silently dropping "4k" even though nothing collided.
    //
    // Instead, pick one consistent "nice" step (a round 1/2/5 x 10^n
    // value) sized so ~5 gridlines cover the padded data range, then
    // generate ticks as exact multiples of that step: 0, step, 2*step,
    // etc. This guarantees evenly spaced round numbers with no skips
    // or duplicates. The axis top (maxVal) snaps to the same step so
    // the topmost gridline lines up with the chart's edge.
    const paddedMax = dataMax * 1.15;
    const step = niceStep(paddedMax / 5);
    const maxVal = Math.ceil(paddedMax / step) * step;

    const yTicks: number[] = [];
    for (let v = 0; v <= maxVal + step * 0.01; v += step) {
      yTicks.push(Math.round(v));
    }

    const stepX = (width - padLeft - padRight) / 11;

    const points = yearData.map((d) => {
      const monthIndex0 = d.month - 1;
      const fraction = d.current_month && d.day ? d.day / daysInMonth(d.year, d.month) : 0;

      // FIX: previously this was `monthIndex0 + fraction`, which
      // anchored the partial-month point to THIS month's tick and
      // pushed it forward into the (this month -> next month)
      // segment — e.g. 25/31 days into August landed 80% of the way
      // toward September, well past the August tick itself.
      //
      // The correct behavior: the partial-month point should live in
      // the (previous month -> this month) segment, sliding from the
      // previous month's tick toward this month's tick as `day`
      // advances, and landing exactly on this month's tick once the
      // month is finished. So we anchor to the PREVIOUS month's tick
      // instead, and never let it exceed this month's tick.
      //
      // Edge case: if this is January (monthIndex0 = 0) and it's the
      // current partial month, there's no "previous month" tick on
      // this year's axis to anchor from. Clamp at 0 so the point
      // stays within the visible chart area instead of drifting off
      // the left edge.
      const xTick =
        d.current_month && d.day
          ? Math.max(0, monthIndex0 - 1 + fraction)
          : monthIndex0;

      const x = padLeft + xTick * stepX;
      const y = padTop + (height - padTop - padBottom) * (1 - d.revenue / maxVal);
      return [x, y, d] as const;
    });

    const currentMonthEntry = yearData.find((d) => d.current_month) ?? null;
    return { points, maxVal, yTicks, currentMonthEntry };
  }, [yearData]);

  // ---- hover state -------------------------------------------------
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (points.length === 0) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * width;
      let closest = 0;
      let closestDist = Infinity;
      points.forEach(([px], i) => {
        const dist = Math.abs(px - relX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      setHoveredIdx(closest);
    },
    [points]
  );
  const handlePointerLeave = useCallback(() => setHoveredIdx(null), []);

  // active point shown in the badge/tooltip: hovered if hovering,
  // else the current month, else nothing
  const activeIdx =
    hoveredIdx !== null
      ? hoveredIdx
      : currentMonthEntry
      ? points.findIndex((p) => p[2] === currentMonthEntry)
      : -1;
  const activePoint = activeIdx >= 0 ? points[activeIdx] : null;
  const activeEntry = activePoint ? activePoint[2] : null;

  let activeChange = 0;
  if (activeEntry) {
    const idx = sortedAll.findIndex((d) => d.year === activeEntry.year && d.month === activeEntry.month);
    const prev = idx > 0 ? sortedAll[idx - 1] : null;
    if (prev && prev.revenue !== 0) {
      activeChange = Math.round(((activeEntry.revenue - prev.revenue) / prev.revenue) * 10000) / 100;
    }
  }

  const linePath =
    points.length > 0
      ? points.map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(" ")
      : "";
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1][0]},${height - padBottom} L ${points[0][0]},${height - padBottom} Z`
      : "";

  const tooltipLeftPct = activePoint ? (activePoint[0] / width) * 100 : 0;
  const tooltipAlign = tooltipLeftPct < 15 ? "left" : tooltipLeftPct > 85 ? "right" : "center";

  // slide transform: 'out' pushes content off in slideDir, 'in' snaps
  // it to the opposite side with no transition, 'idle' eases to 0
  const slideStyle: React.CSSProperties =
    slidePhase === "out"
      ? { transform: `translateX(${-slideDir * 24}px)`, opacity: 0, transition: `transform ${TRANSITION_MS}ms ease, opacity ${TRANSITION_MS}ms ease` }
      : slidePhase === "in"
      ? { transform: `translateX(${slideDir * 24}px)`, opacity: 0, transition: "none" }
      : { transform: "translateX(0)", opacity: 1, transition: `transform ${TRANSITION_MS}ms ease, opacity ${TRANSITION_MS}ms ease` };

  return (
    <div
      ref={containerRef}
      className="rounded-2xl p-4 sm:p-6"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <ChartHeader selectedYear={selectedYear} years={years} />

      <div className="relative w-full overflow-hidden" style={{ minWidth: 0 }}>
        <div style={slideStyle}>
          {points.length === 0 ? (
            <div
              className="flex h-[280px] items-center justify-center text-sm"
              style={{ color: COLORS.textSecondary }}
            >
              No revenue data for {selectedYear}
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full"
              style={{ display: "block", height: "auto", cursor: "crosshair" }}
              preserveAspectRatio="xMidYMid meet"
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
            >
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS.chartFillTop} />
                  <stop offset="100%" stopColor={COLORS.chartFillBottom} />
                </linearGradient>
              </defs>

              {yTicks.map((t, i) => {
                const y = padTop + (height - padTop - padBottom) * (1 - t / maxVal);
                return (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      x2={width - padRight}
                      y1={y}
                      y2={y}
                      stroke={COLORS.chartGrid}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padLeft - 12}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={20}
                      fill={COLORS.textTertiary}
                    >
                      {t / 1000}k
                    </text>
                  </g>
                );
              })}

              <path d={areaPath} fill="url(#areaFill)" />
              <path d={linePath} fill="none" stroke={COLORS.chartLine} strokeWidth={2.5} />

              {/* invisible larger hit targets per point, for easier hover */}
              {points.map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={16}
                  fill="transparent"
                  onPointerEnter={() => setHoveredIdx(i)}
                />
              ))}

              {activePoint && (
                <>
                  <line
                    x1={activePoint[0]}
                    x2={activePoint[0]}
                    y1={activePoint[1]}
                    y2={height - padBottom}
                    stroke={COLORS.textPrimary}
                    strokeDasharray="4 4"
                    opacity={0.5}
                  />
                  <circle
                    cx={activePoint[0]}
                    cy={activePoint[1]}
                    r={6}
                    fill={COLORS.accent}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                </>
              )}

              {/* month labels live inside the same sliding wrapper as
                  the line, so they move together during transitions */}
              {MONTH_LABELS.map((m, i) => {
                const x = padLeft + i * ((width - padLeft - padRight) / 11);
                return (
                  <text
                    key={m}
                    x={x}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize={20}
                    fill={COLORS.textTertiary}
                  >
                    {m}
                  </text>
                );
              })}
            </svg>
          )}
        </div>

        {activeEntry && activePoint && (
          <div
            className="pointer-events-none absolute top-0 rounded-xl px-3 py-2 text-xs sm:px-4"
            style={{
              left: `${tooltipLeftPct}%`,
              transform:
                tooltipAlign === "left"
                  ? "translateX(0)"
                  : tooltipAlign === "right"
                  ? "translateX(-100%)"
                  : "translateX(-50%)",
              backgroundColor: COLORS.bgCardAlt,
              border: `1px solid ${COLORS.border}`,
              whiteSpace: "nowrap",
              transition: `left ${TRANSITION_MS}ms ease`,
            }}
          >
            <div style={{ color: COLORS.textSecondary }}>
              {MONTH_LABELS[activeEntry.month - 1]} {activeEntry.year}
            </div>
            <div className="flex items-center gap-2 font-semibold text-white">
              $ {activeEntry.revenue.toLocaleString()}
              <span style={{ color: activeChange >= 0 ? COLORS.positive : COLORS.negative }}>
                {activeChange >= 0 ? "▲" : "▼"} {Math.abs(activeChange)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartHeader({ selectedYear, years }: { selectedYear: number; years: number[] }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-semibold text-white">Revenue Performance</h3>
      <div className="flex items-center gap-2 text-xs" style={{ color: COLORS.textSecondary }}>
        <span
          className="rounded-full px-3.5 py-1.5 font-medium"
          style={{ backgroundColor: COLORS.accentSoft, color: COLORS.textPrimary }}
        >
          {selectedYear}
        </span>
        {years.length > 1 && <span>scroll to change year</span>}
      </div>
    </div>
  );
}