// =========================================================
// readme.tsx
// In-app README / Docs tab for the "Grind & Co." dashboard
// Visual language matched to home.tsx: glow blobs behind
// hero elements, pill-shaped stat tiles and tags, group-hover
// micro-interactions, rounded-2xl cards on bgCard/bgCardAlt.
// =========================================================

"use client";

import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../../components/sidebar";
import {
  COLORS,
  FONTS,
  SPACING,
} from "../vars";
import {
  Database,
  Workflow,
  FileJson,
  Cpu,
  MonitorSmartphone,
  ArrowRight,
  Clock,
  Zap,
  LayoutDashboard,
  TrendingUp,
  Users,
  AlertTriangle,
  Compass,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------
// Static content for the diagrams — kept as data so the flow is easy
// to reorder or extend without touching layout code.
// ---------------------------------------------------------------------

const WORKFLOW_NODES = [
  { icon: Database, title: "Firestore", subtitle: "Source of truth" },
  { icon: Workflow, title: "GitHub Actions", subtitle: "Scheduled job" },
  { icon: FileJson, title: "Static JSON", subtitle: "Exported snapshot", highlight: true },
  { icon: Cpu, title: "Processing files", subtitle: "Calculates + compresses" },
  { icon: MonitorSmartphone, title: "Dashboard render", subtitle: "Numbers on screen" },
];

const SECTION_BREAKDOWN = [
  {
    icon: LayoutDashboard,
    title: "Overview",
    board: "Overview board",
    copy: "The Overview section gives a top-level snapshot of the business — the numbers someone would want to see first. Behind it, a file on the server side reads the exported static data, pulls out the key totals and summary figures across sales and staff, and compresses that down into a small JSON built specifically for this view. That's what the page actually renders from.",
  },
  {
    icon: TrendingUp,
    title: "Sales Analytics",
    board: "Sales Analytics board",
    copy: "This section breaks down revenue and sales activity in more detail — trends over time, totals by category, whatever cuts matter for understanding how sales are actually moving. A dedicated file on the server side works through the static sales data up through the most recent file available, calculates the revenue streams and totals, and shrinks all of that down into a compact JSON made for this page specifically.",
  },
  {
    icon: Users,
    title: "Staff",
    board: "Staff board",
    copy: "The Staff section covers workforce data — performance, activity, whatever's relevant to how the team is doing. Same pattern as the other two: a server-side file reads through the exported staff data, runs the calculations needed for this view, and produces a smaller JSON that the page reads from directly.",
  },
];

// ---------------------------------------------------------------------
// Scroll reveal — fades/slides each section up once it enters the
// viewport. One-shot (disconnects after firing), respects
// prefers-reduced-motion via the CSS fallback below.
// ---------------------------------------------------------------------

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "reveal-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------

// Mirrors the small bordered pill used for the "tag" on home.tsx's
// RevenueCard (e.g. the period selector next to "Total Annual Revenue").
function Tag({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs"
      style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textSecondary }}
    >
      <Icon size={12} style={{ color: COLORS.textAccent }} />
      {label}
    </div>
  );
}

function Connector({ vertical = false }: { vertical?: boolean }) {
  return (
    <div
      className={
        vertical
          ? "flex items-center justify-center py-1 md:hidden"
          : "hidden items-center justify-center px-1 md:flex"
      }
      style={{ color: COLORS.textTertiary }}
    >
      <ArrowRight size={16} className={vertical ? "rotate-90" : ""} style={{ opacity: 0.6 }} />
    </div>
  );
}

function WorkflowNode({ node, index }: { node: (typeof WORKFLOW_NODES)[number]; index: number }) {
  const Icon = node.icon;
  return (
    <div
      className="wf-node flex flex-1 flex-col items-center gap-2 rounded-xl px-4 py-5 text-center transition-all duration-300"
      style={{
        backgroundColor: node.highlight ? COLORS.accentSoft : COLORS.bgCard,
        border: `1px solid ${node.highlight ? COLORS.accent : COLORS.border}`,
        transitionDelay: `${index * 60}ms`,
      }}
    >
      <div
        className="wf-icon flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-300"
        style={{ backgroundColor: node.highlight ? "rgba(150,175,214,0.18)" : COLORS.bgPill }}
      >
        <Icon size={18} style={{ color: node.highlight ? COLORS.accent : COLORS.textAccent }} />
      </div>
      <div style={{ color: COLORS.textPrimary, fontSize: FONTS.sizeSm, fontWeight: FONTS.weightSemibold }}>
        {node.title}
      </div>
      <div style={{ color: COLORS.textTertiary, fontSize: FONTS.sizeXs, lineHeight: 1.4 }}>
        {node.subtitle}
      </div>
    </div>
  );
}

// Snapshot-tile style stat card (mirrors home.tsx's SnapshotTile:
// icon chip + big bold value + small muted label).
function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div
      className="stat-tile min-w-0 flex-1 rounded-xl p-4 transition-all duration-200"
      style={{ backgroundColor: COLORS.bgCardAlt, border: `1px solid ${COLORS.border}` }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: COLORS.accentSoft }}
        >
          <Icon size={14} style={{ color: COLORS.accent }} />
        </div>
        <span className="truncate text-xs" style={{ color: COLORS.textSecondary }}>
          {label}
        </span>
      </div>
      <div className="font-bold text-white" style={{ fontSize: "clamp(1rem, 1.6vw, 1.25rem)" }}>
        {value}
      </div>
    </div>
  );
}

function MiniDiagram({ board }: { board: string }) {
  return (
    <div className="group/mini mt-4 flex items-center gap-2">
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover/mini:-translate-y-0.5"
        style={{ backgroundColor: COLORS.bgPill }}
      >
        <FileJson size={14} style={{ color: COLORS.textAccent }} />
      </div>
      <ChevronRight
        size={13}
        className="transition-transform duration-200 group-hover/mini:translate-x-0.5"
        style={{ color: COLORS.textTertiary }}
      />
      <div
        className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 delay-75 group-hover/mini:-translate-y-0.5"
        style={{ backgroundColor: COLORS.bgPill }}
      >
        <Cpu size={14} style={{ color: COLORS.textAccent }} />
      </div>
      <ChevronRight
        size={13}
        className="transition-transform duration-200 group-hover/mini:translate-x-0.5"
        style={{ color: COLORS.textTertiary }}
      />
      <div
        className="rounded-full px-2.5 py-1 transition-transform duration-200 delay-150 group-hover/mini:-translate-y-0.5"
        style={{ backgroundColor: COLORS.accentSoft, border: `1px solid ${COLORS.accent}` }}
      >
        <span style={{ color: COLORS.accent, fontSize: FONTS.sizeXs, fontWeight: FONTS.weightMedium }}>
          {board}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

export default function Readme() {
  return (
    <div
      className="flex min-h-screen w-full flex-col md:flex-row"
      style={{ backgroundColor: COLORS.bgApp, fontFamily: FONTS.family }}
    >
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto flex max-w-3xl flex-col" style={{ gap: SPACING.xl }}>

          {/* Section 1 — Intro */}
          <Reveal>
            <section className="relative overflow-hidden rounded-2xl p-1">
              <div
                className="pointer-events-none absolute -left-10 -top-16 h-48 w-48 rounded-full blur-3xl"
                style={{ backgroundColor: COLORS.accentGlow }}
              />
              <div className="relative">
                <h1
                  style={{
                    color: COLORS.textPrimary,
                    fontSize: FONTS.size2xl,
                    fontWeight: FONTS.weightSemibold,
                    marginBottom: SPACING.sm,
                  }}
                >
                  About This Dashboard
                </h1>
                <p style={{ color: COLORS.textSecondary, fontSize: FONTS.sizeMd, lineHeight: 1.65, maxWidth: "62ch" }}>
                  This is a business intelligence dashboard built to give a business owner or
                  executive a direct, real view of their company's performance — sales, staff,
                  and overall business health — without depending on filtered or delayed
                  reports from managers. It's organized into three sections: Overview, Sales
                  Analytics, and Staff. Each one pulls from real underlying data and is meant
                  to be checked quickly, even from a phone, without digging through
                  spreadsheets or waiting on someone else to compile it.
                </p>
              </div>
            </section>
          </Reveal>

          {/* Section 2 — Workflow diagram */}
          <Reveal delay={60}>
            <section
              className="relative overflow-hidden rounded-2xl p-5 sm:p-7"
              style={{ backgroundColor: COLORS.bgCardAlt, border: `1px solid ${COLORS.border}` }}
            >
              <div
                className="pointer-events-none absolute -right-16 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full blur-3xl"
                style={{ backgroundColor: COLORS.accentGlow }}
              />
              <div className="relative mb-5 flex flex-wrap items-center justify-between gap-2">
                <h2 style={{ color: COLORS.textPrimary, fontSize: FONTS.sizeLg, fontWeight: FONTS.weightSemibold }}>
                  How data gets to the screen
                </h2>
                <Tag icon={Workflow} label="Runs automatically" />
              </div>

              <div className="relative flex flex-col md:flex-row md:items-stretch">
                {WORKFLOW_NODES.map((node, i) => (
                  <div key={node.title} className="flex flex-col md:flex-row md:flex-1 md:items-stretch">
                    <WorkflowNode node={node} index={i} />
                    {i < WORKFLOW_NODES.length - 1 && (
                      <>
                        <Connector />
                        <Connector vertical />
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="relative mt-5 flex flex-wrap gap-3">
                <StatTile icon={Clock} value="4× / day" label="Export cadence" />
                <StatTile icon={Zap} value="< 1s" label="Average load" />
              </div>
            </section>
          </Reveal>

          {/* Section 3 — Why static */}
          <Reveal delay={60}>
            <section
              className="relative flex flex-col gap-5 overflow-hidden rounded-2xl p-5 sm:flex-row sm:items-center sm:p-7"
              style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
            >
              <div
                className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full blur-3xl"
                style={{ backgroundColor: COLORS.accentGlow }}
              />
              <div
                className="stat-hero relative flex shrink-0 flex-col items-center justify-center rounded-xl px-5 py-4 transition-transform duration-300 sm:w-32"
                style={{ backgroundColor: COLORS.accentSoft, border: `1px solid ${COLORS.accent}` }}
              >
                <span style={{ color: COLORS.accent, fontSize: FONTS.size2xl, fontWeight: FONTS.weightBold }}>
                  &lt;1s
                </span>
                <span style={{ color: COLORS.textSecondary, fontSize: FONTS.sizeXs, textAlign: "center", marginTop: 2 }}>
                  average load
                </span>
              </div>
              <div className="relative">
                <h2 style={{ color: COLORS.textPrimary, fontSize: FONTS.sizeLg, fontWeight: FONTS.weightSemibold, marginBottom: SPACING.sm }}>
                  Why static, not live queries
                </h2>
                <p style={{ color: COLORS.textSecondary, fontSize: FONTS.sizeMd, lineHeight: 1.65 }}>
                  The dashboard doesn't query the database directly when someone loads a
                  page. Instead, data is exported on a schedule into static files, and the
                  dashboard reads from those. The alternative — calling the database live on
                  every page load — would mean pulling potentially thousands of records,
                  then running processing on them in real time before anything could
                  render. That adds real, noticeable delay, and it wasn't necessary here:
                  this dashboard doesn't need up-to-the-minute data, it needs to be fast and
                  reliable every time someone opens it. Static files made that possible. On
                  a normal internet connection, the dashboard loads in under a second.
                </p>
              </div>
            </section>
          </Reveal>

          {/* Section 4 — Per-section breakdown */}
          <Reveal delay={80}>
            <section>
              <h2 style={{ color: COLORS.textPrimary, fontSize: FONTS.sizeLg, fontWeight: FONTS.weightSemibold, marginBottom: SPACING.md }}>
                Section by section
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {SECTION_BREAKDOWN.map(({ icon: Icon, title, board, copy }, i) => (
                  <div
                    key={title}
                    className="breakdown-card group flex flex-col rounded-2xl p-5 transition-all duration-300"
                    style={{
                      backgroundColor: COLORS.bgCard,
                      border: `1px solid ${COLORS.border}`,
                      transitionDelay: `${i * 40}ms`,
                    }}
                  >
                    <div
                      className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-300"
                      style={{ backgroundColor: COLORS.bgPill }}
                    >
                      <Icon size={16} style={{ color: COLORS.textAccent }} />
                    </div>
                    <h3 style={{ color: COLORS.textPrimary, fontSize: FONTS.sizeMd, fontWeight: FONTS.weightSemibold, marginBottom: SPACING.xs }}>
                      {title}
                    </h3>
                    <p style={{ color: COLORS.textSecondary, fontSize: FONTS.sizeSm, lineHeight: 1.6 }}>
                      {copy}
                    </p>
                    <MiniDiagram board={board} />
                  </div>
                ))}
              </div>
            </section>
          </Reveal>

          {/* Section 5 & 6 — Limitations + Roadmap */}
          <Reveal delay={60}>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div
                className="foot-card flex gap-3 rounded-xl p-4 transition-all duration-200"
                style={{ backgroundColor: COLORS.bgCardAlt, border: `1px solid ${COLORS.borderSoft}` }}
              >
                <AlertTriangle size={16} style={{ color: COLORS.textTertiary, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ color: COLORS.textSecondary, fontSize: FONTS.sizeSm, fontWeight: FONTS.weightMedium, marginBottom: 2 }}>
                    Known limitations
                  </div>
                  <p style={{ color: COLORS.textTertiary, fontSize: FONTS.sizeXs, lineHeight: 1.55 }}>
                    The scheduled data export doesn't currently have retry logic — if a run
                    fails partway through (for example, hitting a database read limit), it
                    can silently not update the files instead of flagging the failure.
                  </p>
                </div>
              </div>

              <div
                className="foot-card flex gap-3 rounded-xl p-4 transition-all duration-200"
                style={{ backgroundColor: COLORS.bgCardAlt, border: `1px solid ${COLORS.borderSoft}` }}
              >
                <Compass size={16} style={{ color: COLORS.textTertiary, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ color: COLORS.textSecondary, fontSize: FONTS.sizeSm, fontWeight: FONTS.weightMedium, marginBottom: 2 }}>
                    Roadmap
                  </div>
                  <p style={{ color: COLORS.textTertiary, fontSize: FONTS.sizeXs, lineHeight: 1.55 }}>
                    An AI-powered summary and query feature — letting someone ask questions
                    about the data directly and get a plain-English answer — is planned but
                    not yet part of this version.
                  </p>
                </div>
              </div>
            </section>
          </Reveal>

          {/* Section 7 — Data disclaimer */}
          <Reveal delay={40}>
            <p className="pb-2 text-center" style={{ color: COLORS.textTertiary, fontSize: FONTS.sizeXs, opacity: 0.75 }}>
              All data shown in this dashboard is synthetic — generated for demonstration
              purposes and not tied to any real company, customer, or individual.
            </p>
          </Reveal>
        </div>
      </main>

      <style>{`
        .reveal {
          opacity: 0;
          transform: translateY(18px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .wf-node:hover {
          border-color: ${COLORS.accent} !important;
          transform: translateY(-3px);
        }
        .wf-node:hover .wf-icon {
          background-color: rgba(150,175,214,0.22) !important;
        }

        .stat-tile:hover {
          border-color: ${COLORS.accent} !important;
          transform: translateY(-2px);
        }
        .stat-hero:hover {
          transform: scale(1.03);
        }

        .breakdown-card:hover {
          border-color: ${COLORS.accent} !important;
          transform: translateY(-3px);
        }

        .foot-card:hover {
          border-color: ${COLORS.accent} !important;
          transform: translateY(-2px);
        }

        @media (prefers-reduced-motion: reduce) {
          .reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
          .wf-node, .stat-tile, .stat-hero, .breakdown-card, .foot-card {
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}