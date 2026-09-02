// =========================================================
// staff.tsx
// "Grind & Co." coffee shop admin dashboard — Staff page
//
// Dependencies:
//   npm install lucide-react
// Tailwind must be configured in the host project (this uses
// utility classes for layout/spacing; colors/fonts come from vars.js).
//
// Mirrors the shell (Sidebar/Header) and design tokens used in
// home.tsx so the two pages feel like one product.
//
// Data comes from data/staff-summary.json (written by scripts/staff.py),
// loaded server-side by page.tsx via lib/staff.ts and passed in as the
// `data` prop — see page.tsx for the load. No separate transform file:
// staff.py already computes every derived number (averages, rates), so
// this component just filters/formats what it's given.
// =========================================================

"use client"
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/sidebar"
import {
  Sparkles,
  ChevronDown,
  Download,
  Search,
} from "lucide-react";

import {
  COLORS,
  FONTS,
} from "../vars";

import type { StaffSummary, StaffMember } from "../../lib/staff";

type StaffStatus = "Active" | "Inactive";

const EXPERIENCE_OPTIONS = ["All", "< 1 year", "1–3 years", "3+ years"];

// Branch pill colors — distinct per branch, same accent language as home.tsx.
// Falls back to a neutral pill for any branch name not in this map (e.g.
// a new branch added to the data that hasn't gotten a color yet).
const BRANCH_STYLES: Record<string, { bg: string; text: string }> = {
  Downtown: { bg: "rgba(236, 72, 153, 0.16)", text: "#F472B6" },
  Uptown: { bg: "rgba(168, 85, 247, 0.16)", text: "#C084FC" },
  Riverside: { bg: "rgba(99, 102, 241, 0.16)", text: "#A5B4FC" },
};

const STATUS_STYLES: Record<StaffStatus, { text: string }> = {
  Active: { text: COLORS.textSecondary },
  Inactive: { text: "#FB7185" },
};

function initials(name: string) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// deterministic-ish soft color per person, so avatars aren't all identical.
// Seeded off employee_id (stable, unique) instead of a name-derived seed.
const AVATAR_PALETTE = ["#F472B6", "#C084FC", "#A5B4FC", "#5EEAD4", "#FBBF24", "#FB7185"];
function avatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function normalizeStatus(status: string): StaffStatus {
  return (status || "").toLowerCase() === "active" ? "Active" : "Inactive";
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// Years of tenure from date_of_joining through termination_date (or today
// if still active). Returns null for missing/malformed dates so callers
// can exclude those employees from experience filtering rather than
// mis-bucketing them.
function computeExperienceYears(
  dateOfJoining: string | null | undefined,
  terminationDate: string | null | undefined
): number | null {
  if (!dateOfJoining) return null;
  const start = new Date(dateOfJoining);
  if (Number.isNaN(start.getTime())) return null;

  const end = terminationDate ? new Date(terminationDate) : new Date();
  if (Number.isNaN(end.getTime())) return null;

  const ms = end.getTime() - start.getTime();
  if (ms < 0) return null;

  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

function experienceBucket(years: number | null): string | null {
  if (years === null) return null;
  if (years < 1) return "< 1 year";
  if (years < 3) return "1–3 years";
  return "3+ years";
}

// Builds a CSV from the given staff list and triggers a browser download.
// Escapes any field containing a comma, quote, or newline per CSV spec.
function exportStaffToCsv(staff: StaffMember[]) {
  const headers = ["Name", "Role", "Branch", "Status", "Performance", "Date of Joining", "Termination Date"];

  const rows = staff.map((m) => [
    m.name,
    m.role,
    m.branch,
    normalizeStatus(m.status),
    m.performance?.avg_performance ? m.performance.avg_performance.toFixed(1) : "",
    m.date_of_joining ?? "",
    m.termination_date ?? "",
  ]);

  const escapeCell = (val: string) =>
    /[",\n]/.test(val) ? `"${val.replace(/"/g, '""')}"` : val;

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCell(String(cell))).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `staff-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatGeneratedAt(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------
// Header (mirrors home.tsx)
// ---------------------------------------------------------------------
function Header({ userName, lastUpdated }: { userName: string; lastUpdated?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = () => {
    router.push("/llmsummary");
  };

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-[180px] shrink-0">
        <h1 className="whitespace-nowrap text-xl font-bold text-white sm:text-2xl">Staff</h1>
        <p className="mt-1 whitespace-nowrap text-xs sm:text-sm" style={{ color: COLORS.textSecondary }}>
          Manage your coffee shop&rsquo;s staff across all branches.
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
            className="h-10 w-10 shrink-0 overflow-hidden rounded-full"
            style={{ backgroundColor: COLORS.accentSoft }}
          />
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
// Filter dropdown — now actually functional: click to open a real
// option list, click an option to apply it and close, click outside to
// dismiss without changing anything.
// ---------------------------------------------------------------------
function FilterDropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        style={{ backgroundColor: COLORS.bgPill, border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}
      >
        <span style={{ color: COLORS.textTertiary }}>{label}</span>
        <span className="font-medium text-white">{value}</span>
        <ChevronDown
          size={14}
          className="transition-transform duration-200 ease-out"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {/* Always mounted so open/close can transition smoothly instead of
          popping in/out; hidden via opacity + pointer-events when closed. */}
      <div
        className="absolute left-0 top-full z-20 mt-2 max-h-64 min-w-[180px] origin-top overflow-y-auto rounded-xl py-1 transition-all duration-150 ease-out"
        style={{
          backgroundColor: COLORS.bgCard,
          border: `1px solid ${COLORS.border}`,
          opacity: open ? 1 : 0,
          transform: open ? "scale(1) translateY(0)" : "scale(0.96) translateY(-6px)",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              onChange(opt);
              setOpen(false);
            }}
            className="block w-full whitespace-nowrap px-4 py-2.5 text-left text-sm transition-colors duration-150"
            style={{
              color: opt === value ? COLORS.textPrimary : COLORS.textSecondary,
              backgroundColor: opt === value ? COLORS.accentSoft : "transparent",
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Toolbar: filters + Export action
// ---------------------------------------------------------------------
function StaffToolbar({
  branchFilter,
  branchOptions,
  onBranchChange,
  roleFilter,
  roleOptions,
  onRoleChange,
  experienceFilter,
  onExperienceChange,
  onExport,
}: {
  branchFilter: string;
  branchOptions: string[];
  onBranchChange: (b: string) => void;
  roleFilter: string;
  roleOptions: string[];
  onRoleChange: (r: string) => void;
  experienceFilter: string;
  onExperienceChange: (e: string) => void;
  onExport: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <FilterDropdown label="Branch" value={branchFilter} options={branchOptions} onChange={onBranchChange} />
        <FilterDropdown label="Role" value={roleFilter} options={roleOptions} onChange={onRoleChange} />
        <FilterDropdown
          label="Experience"
          value={experienceFilter}
          options={EXPERIENCE_OPTIONS}
          onChange={onExperienceChange}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onExport}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
          style={{ backgroundColor: COLORS.bgPill, border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary }}
        >
          <Download size={16} />
          Export
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Staff table
// ---------------------------------------------------------------------
const COLUMNS = ["Photo", "Name", "Role / Position", "Branch", "Status", "Performance"];

function StaffAvatar({ member }: { member: StaffMember }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: avatarColor(member.employee_id) }}
    >
      {initials(member.name)}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const style = STATUS_STYLES[normalized];
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{ color: style.text }}
    >
      {normalized}
    </span>
  );
}

function BranchBadge({ branch }: { branch: string }) {
  const style = BRANCH_STYLES[branch] ?? { bg: COLORS.bgPill, text: COLORS.textSecondary };
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{ color: COLORS.textSecondary }}
    >
      {branch || "—"}
    </span>
  );
}

// Headline performance figure shown in the collapsed row: avg_performance
// (the manager's 0-5 monthly rating, averaged across all recorded months —
// see staff.py). Employees with no sales/performance records at all get a
// neutral "No data" pill instead of a misleading "0.0".
function PerformanceBadge({ score }: { score: number }) {
  if (!score) {
    return (
      <span
        className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
        style={{ backgroundColor: COLORS.bgPill, color: COLORS.textTertiary }}
      >
        No data
      </span>
    );
  }

  let bg = "rgba(244, 63, 94, 0.00)";
  let text = "#FB7185";
  if (score >= 4.5) {
    bg = "rgba(34, 197, 94, 0.00)";
    text = "#4ADE80";
  } else if (score >= 3.5) {
    bg = "rgba(250, 204, 21, 0.00)";
    text = COLORS.textSecondary;
  }

  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: bg, color: text }}>
      {score.toFixed(1)} / 5
    </span>
  );
}

// Detail panel shown when a row is expanded — every field staff.py
// actually computes that isn't already visible in the collapsed row.
function ExpandedDetails({ member }: { member: StaffMember }) {
  const p = member.performance;

  const rows: { label: string; value: string }[] = [
    { label: "Employment Type", value: member.employment_type || "—" },
    { label: "Date of Joining", value: formatDate(member.date_of_joining) },
    { label: "Termination Date", value: member.termination_date ? formatDate(member.termination_date) : "—" },
    { label: "Avg Hours Worked / mo", value: p.avg_hours_worked ? p.avg_hours_worked.toFixed(1) : "—" },
    { label: "Avg Shifts Worked / mo", value: p.avg_shifts_worked ? p.avg_shifts_worked.toFixed(1) : "—" },
    { label: "Presence Rate", value: `${p.presence_rate.toFixed(1)}%` },
    { label: "Correct Order Ratio", value: `${p.correct_order_ratio.toFixed(1)}%` },
    { label: "Customer Success Rate", value: `${p.customer_success_rate.toFixed(1)}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-6 py-5 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="text-xs uppercase tracking-wide" style={{ color: COLORS.textTertiary }}>
            {r.label}
          </div>
          <div className="mt-1 text-sm font-medium text-white">{r.value}</div>
        </div>
      ))}
    </div>
  );
}

function StaffTable({
  staff,
  expandedId,
  onToggle,
}: {
  staff: StaffMember[];
  expandedId: string | null;
  onToggle: (employeeId: string) => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-2xl"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="whitespace-nowrap px-6 py-4 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ color: COLORS.textTertiary }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-6 py-10 text-center text-sm" style={{ color: COLORS.textTertiary }}>
                  No staff match the current filters.
                </td>
              </tr>
            ) : (
              staff.map((member, i) => {
                const isExpanded = expandedId === member.employee_id;
                const isLast = i === staff.length - 1;
                return (
                  <React.Fragment key={member.employee_id}>
                    <tr
                      onClick={() => onToggle(member.employee_id)}
                      className="cursor-pointer transition-colors duration-200 hover:bg-white/[0.03]"
                      style={{
                        borderBottom: "none",
                        backgroundColor: isExpanded ? COLORS.accentSoft : "transparent",
                      }}
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <StaffAvatar member={member} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-white">{member.name}</td>
                      <td className="whitespace-nowrap px-6 py-4" style={{ color: COLORS.textSecondary }}>
                        {member.role}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <BranchBadge branch={member.branch} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <PerformanceBadge score={member.performance?.avg_performance ?? 0} />
                      </td>
                    </tr>
                    {/* Always mounted (not conditionally rendered) so the
                        expand/collapse can transition smoothly via
                        max-height + opacity instead of popping in/out. */}
                    <tr style={{ borderBottom: isLast ? "none" : `1px solid ${COLORS.border}` }}>
                      <td colSpan={COLUMNS.length} style={{ backgroundColor: COLORS.bgApp, padding: 0 }}>
                        <div
                          className="overflow-hidden transition-all duration-300 ease-in-out"
                          style={{
                            maxHeight: isExpanded ? "400px" : "0px",
                            opacity: isExpanded ? 1 : 0,
                          }}
                        >
                          <ExpandedDetails member={member} />
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })
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
export default function Staff({ data }: { data: StaffSummary }) {
  const employees = data?.employees ?? [];

  const [branchFilter, setBranchFilter] = useState<string>("All Branches");
  const [roleFilter, setRoleFilter] = useState<string>("All Roles");
  const [experienceFilter, setExperienceFilter] = useState<string>("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const branchOptions = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.branch).filter(Boolean)));
    return ["All Branches", ...unique];
  }, [employees]);

  const roleOptions = useMemo(() => {
    const unique = Array.from(new Set(employees.map((e) => e.role).filter(Boolean)));
    return ["All Roles", ...unique];
  }, [employees]);

  const filteredStaff = useMemo(() => {
    return employees.filter((m) => {
      if (branchFilter !== "All Branches" && m.branch !== branchFilter) return false;
      if (roleFilter !== "All Roles" && m.role !== roleFilter) return false;
      if (experienceFilter !== "All") {
        const years = computeExperienceYears(m.date_of_joining, m.termination_date);
        if (experienceBucket(years) !== experienceFilter) return false;
      }
      return true;
    });
  }, [employees, branchFilter, roleFilter, experienceFilter]);

  return (
    <div
          className="flex h-screen w-full flex-col overflow-hidden md:flex-row"
          style={{ backgroundColor: COLORS.bgApp, fontFamily: FONTS.family }}
        >
          <Sidebar />
          <main className="readme-scroll-area h-full min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <Header userName="Asfar" lastUpdated={formatGeneratedAt(data.generated_at)} />

        <StaffToolbar
          branchFilter={branchFilter}
          branchOptions={branchOptions}
          onBranchChange={setBranchFilter}
          roleFilter={roleFilter}
          roleOptions={roleOptions}
          onRoleChange={setRoleFilter}
          experienceFilter={experienceFilter}
          onExperienceChange={setExperienceFilter}
          onExport={() => exportStaffToCsv(filteredStaff)}
        />

        <StaffTable
          staff={filteredStaff}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
        />
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