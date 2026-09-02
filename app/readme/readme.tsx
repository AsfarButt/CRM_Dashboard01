// =========================================================
// readme.tsx
// "Grind & Co." coffee shop admin dashboard — in-app README
//
// Same pattern as home.tsx: Tailwind for layout/spacing,
// colors/fonts pulled from vars.js at runtime. No styled-jsx
// anywhere in this file.
// =========================================================

"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import Sidebar from "../../components/sidebar";
import { Database, Clock, FileJson, Settings, Monitor } from "lucide-react";
import { COLORS, FONTS } from "../vars";

// ---------------------------------------------------------------------
// Scroll-reveal hook — fires once, the first time an element crosses
// into the viewport, then disconnects. Skips straight to visible if
// the user has prefers-reduced-motion on.
// ---------------------------------------------------------------------

function useRevealOnScroll<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function useHover() {
  const [hovered, setHovered] = useState(false);
  return {
    hovered,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}

function Reveal({
  children,
  delayMs = 0,
  className = "",
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 550ms ease ${delayMs}ms, transform 550ms ease ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------
// Flow arrow — a static connector between workflow steps.
// ---------------------------------------------------------------------

function FlowArrow({ grow = true }: { grow?: boolean }) {
  return (
    <div
      className={`relative mx-1 h-0.5 shrink-0 ${
        grow ? "min-w-[20px] flex-1" : "w-4"
      }`}
    >
      <span
        className="absolute inset-0"
        style={{ backgroundColor: COLORS.border }}
      />
      <span
        className="absolute -top-[3px] right-[-1px] h-2 w-2 rotate-45"
        style={{
          borderTop: `2px solid ${COLORS.border}`,
          borderRight: `2px solid ${COLORS.border}`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Main workflow diagram node
// ---------------------------------------------------------------------

function WorkflowNode({
  label,
  detail,
  Icon,
  visible,
  delayMs,
}: {
  label: string;
  detail: string;
  Icon: React.ComponentType<{ size?: number }>;
  visible: boolean;
  delayMs: number;
}) {
  const { hovered, onMouseEnter, onMouseLeave } = useHover();

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative flex min-w-[108px] flex-col items-center gap-2 rounded-xl px-3 py-3.5 text-center"
      style={{
        backgroundColor: COLORS.bgCardAlt,
        border: `1px solid ${hovered ? COLORS.textTertiary : COLORS.border}`,
        opacity: visible ? 1 : 0,
        zIndex: hovered ? 30 : 0,
        transform: visible ? "translateY(0)" : "translateY(10px)",
        transition: `opacity 450ms ease ${delayMs}ms, border-color 200ms ease`,
      }}
    >
      <span style={{ color: hovered ? COLORS.textPrimary : COLORS.textAccent }}>
        <Icon size={20} />
      </span>
      <span
        className="text-xs font-medium"
        style={{ color: hovered ? COLORS.textPrimary : COLORS.textSecondary }}
      >
        {label}
      </span>

      <div
        className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-52 -translate-x-1/2 rounded-lg p-3 text-left text-[11px] leading-relaxed"
        style={{
          backgroundColor: COLORS.bgCardAlt,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.textSecondary,
          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.35)",
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translate(-50%, 0)" : "translate(-50%, -4px)",
          transition: "opacity 160ms ease, transform 160ms ease",
        }}
      >
        {detail}
      </div>
    </div>
  );
}

const WORKFLOW_NODES = [
  {
    label: "Firestore",
    Icon: Database,
    detail:
      "The main database, stored in Firestore, is updated every day with new files as streaming data comes in.",
  },
  {
    label: "Scheduled export",
    Icon: Clock,
    detail:
      "A GitHub workflow extracts that data and runs it through processing once a day.",
  },
  {
    label: "Static JSON",
    Icon: FileJson,
    detail:
      "The result is a set of static JSON files — compact yet precise summaries and insights built from the underlying data.",
  },
  {
    label: "Processing layer",
    Icon: Settings,
    detail:
      "A server-side file reads that JSON and calculates the specific totals and figures each dashboard section needs.",
  },
  {
    label: "Dashboard render",
    Icon: Monitor,
    detail:
      "The dashboard reads the processed output and renders it directly — no live database queries, no waiting.",
  },
];

function WorkflowDiagram() {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>(0.25);

  return (
    <div
      ref={ref}
      className="rounded-2xl p-6"
      style={{ backgroundColor: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}
    >
      <div className="flex flex-wrap items-center gap-1">
        {WORKFLOW_NODES.map((node, i) => (
          <div className="flex flex-1 items-center" key={node.label}>
            <WorkflowNode
              label={node.label}
              detail={node.detail}
              Icon={node.Icon}
              visible={visible}
              delayMs={i * 110}
            />
            {i < WORKFLOW_NODES.length - 1 && <FlowArrow />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Mini per-section flow
// ---------------------------------------------------------------------

function MiniFlow({ endLabel }: { endLabel: string }) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>(0.3);
  return (
    <div
      ref={ref}
      className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 450ms ease, transform 450ms ease",
      }}
    >
      <span
        className="flex min-w-0 items-center gap-1 text-[11px]"
        style={{ color: COLORS.textTertiary }}
      >
        <FileJson size={14} className="shrink-0" />
        <span className="truncate">Static JSON</span>
      </span>
      <FlowArrow grow={false} />
      <span
        className="flex min-w-0 items-center gap-1 text-[11px]"
        style={{ color: COLORS.textTertiary }}
      >
        <Settings size={14} className="shrink-0" />
        <span className="truncate">Processing file</span>
      </span>
      <FlowArrow grow={false} />
      <span
        className="flex min-w-0 items-center gap-1 text-[11px] font-medium"
        style={{ color: COLORS.textPrimary }}
      >
        <Monitor size={14} className="shrink-0" />
        <span className="truncate">{endLabel}</span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------
// Per-section card — one-line first-person tagline plus feature pills.
// ---------------------------------------------------------------------

function FeaturePill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium"
      style={{
        backgroundColor: COLORS.bgPill,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.textSecondary,
      }}
    >
      {label}
    </span>
  );
}

function SectionCard({
  title,
  tagline,
  features,
  endLabel,
  delayMs,
}: {
  title: string;
  tagline: string;
  features: string[];
  endLabel: string;
  delayMs: number;
}) {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="flex h-full min-w-0 flex-col gap-4 rounded-2xl p-6"
      style={{
        backgroundColor: COLORS.bgCard,
        border: `1px solid ${COLORS.border}`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(14px)",
        transition: `opacity 550ms ease ${delayMs}ms, transform 550ms ease ${delayMs}ms`,
      }}
    >
      <div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm" style={{ color: COLORS.textSecondary }}>
          {tagline}
        </p>
      </div>

      <div className="flex flex-1 flex-wrap content-start gap-2">
        {features.map((f) => (
          <FeaturePill key={f} label={f} />
        ))}
      </div>

      <MiniFlow endLabel={endLabel} />
    </div>
  );
}

// ---------------------------------------------------------------------
// Simple label + description row, used in the Tech Stack and
// Limitations sections below.
// ---------------------------------------------------------------------

function InfoRow({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl p-4" style={{ backgroundColor: COLORS.bgCardAlt }}>
      <span className="text-xs font-medium" style={{ color: COLORS.textAccent }}>
        {label}
      </span>
      <span className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
        {detail}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

const DIAGRAM_MAX_WIDTH = "max-w-[640px]";

export default function Readme() {
  const [heroMounted, setHeroMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHeroMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden md:flex-row"
      style={{ backgroundColor: COLORS.bgApp, fontFamily: FONTS.family }}
    >
      <Sidebar />
      <main className="readme-scroll-area h-full min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="flex w-full flex-col gap-12 pb-12">
          {/* 1. Intro */}
          <section
            className="relative"
            style={{
              opacity: heroMounted ? 1 : 0,
              transform: heroMounted ? "translateY(0)" : "translateY(10px)",
              transition: "opacity 600ms ease, transform 600ms ease",
            }}
          >
            <div
              className="pointer-events-none absolute -left-8 -top-10 h-44 w-64 rounded-full blur-3xl"
              style={{ backgroundColor: COLORS.accentGlow }}
            />
            <h1 className="relative text-2xl font-bold text-white sm:text-[28px]">
              About this dashboard
            </h1>
            <p
              className="relative mt-3 w-full text-sm leading-relaxed sm:text-base"
              style={{ color: COLORS.textSecondary }}
            >
              This is a business intelligence dashboard I designed and built
              around Grind &amp; Co., a fictional three-branch coffee shop
              chain. Since I did not have access to a real business&rsquo;s
              operational data, I constructed a synthetic dataset that
              mirrors what an actual multi-location retail operation
              generates day to day — sales transactions, staff performance,
              and supply orders — and built this dashboard to work against
              it exactly as it would against production data. The intent
              was to demonstrate a complete, realistic data pipeline: from
              raw data, through processing, to a dashboard someone could
              genuinely use to run a business.
            </p>
          </section>

          {/* 2. The problem this addresses */}
          <Reveal className="w-full">
            <h3 className="mb-2 text-base font-semibold text-white">Why I approached it this way</h3>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
              Most dashboard demos skip the hard part: they render mock
              numbers directly in the frontend, which proves very little
              about how the system would behave with real, changing data.
              I wanted to avoid that shortcut. Everything shown here is
              generated once, written to a database, exported on a
              schedule, processed, and only then rendered — the same
              sequence a production system would follow, rather than
              numbers invented purely for the interface.
            </p>
          </Reveal>

          {/* 3. Workflow diagram */}
          <Reveal className="w-full">
            <p className="mb-3 text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
              The data passes through five stages before it reaches the screen:
            </p>
            <div className={`mx-auto w-full ${DIAGRAM_MAX_WIDTH}`}>
              <WorkflowDiagram />
            </div>
          </Reveal>

          {/* 4. Why static, not live queries */}
          <Reveal className="w-full">
            <h3 className="mb-2 text-base font-semibold text-white">Static exports over live queries</h3>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
              I made a deliberate decision not to query the database
              directly on page load. A live query would mean pulling
              potentially thousands of records and processing them in real
              time on every visit — measurably slower, and unnecessary for
              this use case. Instead, data is exported on a schedule into
              static JSON files, and the dashboard reads only from those.
              This trades a small amount of freshness for consistent,
              predictable performance: on a typical connection, the
              dashboard loads in under a second, which mattered more here
              than up-to-the-minute accuracy.
            </p>
          </Reveal>

          {/* 5. Tech stack */}
          <Reveal className="w-full">
            <h3 className="mb-3 text-base font-semibold text-white">How it&rsquo;s built</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow
                label="Frontend"
                detail="Next.js and React, styled entirely with Tailwind. No external UI kit — the filters, charts, and tables are all custom-built for this dashboard."
              />
              <InfoRow
                label="Processing layer"
                detail="A set of Python scripts read the exported JSON, calculate the derived figures each page needs (averages, rates, trends), and write a compact summary file per section."
              />
              <InfoRow
                label="Rendering"
                detail="Each page component receives its already-processed data as a prop and only handles filtering, formatting, and layout — no computation happens on the client."
              />
              <InfoRow
                label="Source data"
                detail="A synthetic dataset generated to resemble real coffee shop operations, refreshed daily to keep every branch's numbers moving realistically over time."
              />
            </div>
          </Reveal>

          {/* 6. Per-section breakdown */}
          <div
            className="grid w-full gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}
          >
            <SectionCard
              title="Overview"
              tagline="A branch-level snapshot, switchable in a single click."
              features={[
                "Downtown · Uptown · Riverside",
                "This Week / Top Rated / Slow Movers",
                "Today vs. yesterday",
                "Refreshes daily",
              ]}
              endLabel="Overview board"
              delayMs={0}
            />
            <SectionCard
              title="Sales Analytics"
              tagline="Revenue, profit, and supply cost, compared across every branch."
              features={[
                "Revenue by branch, plotted",
                "Profit vs. investment",
                "30-day trend on every KPI",
                "Supply orders → suppliers",
              ]}
              endLabel="Sales Analytics board"
              delayMs={90}
            />
            <SectionCard
              title="Staff"
              tagline="A filterable record of every employee, across every branch."
              features={[
                "Filter by branch, role, experience",
                "Click a row to expand it",
                "Presence & order accuracy",
                "Export to CSV",
              ]}
              endLabel="Staff board"
              delayMs={180}
            />
          </div>

          {/* 7. Limitations */}
          <Reveal className="w-full">
            <h3 className="mb-2 text-base font-semibold text-white">Where this stops short of production</h3>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
              This is a portfolio project, not a production system, and I
              want to be upfront about that. The data is synthetic,
              refreshed on a fixed daily schedule rather than in real time,
              and there is no authentication layer — anyone with the link
              can view it. None of that would be acceptable for an actual
              business, but reproducing those constraints was not the
              point here; demonstrating the architecture was.
            </p>
          </Reveal>

          {/* 8. Final note */}
          <Reveal className="w-full">
            <h3 className="mb-2 text-base font-semibold text-white">Final note</h3>
            <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
              The underlying principle throughout was separation of
              concerns: the data pipeline runs independently of the
              dashboard, and the dashboard never does more work than
              rendering what it is handed. That keeps the system fast
              without sacrificing depth, and it is the same pattern I
              would bring to a production dashboard — simply swapping the
              synthetic data source for a real one.
            </p>
          </Reveal>

          {/* 9. Data disclaimer */}
          <p className="text-[11px]" style={{ color: COLORS.textTertiary }}>
            All data shown in this dashboard is synthetic — generated for
            demonstration purposes and not tied to any real company,
            customer, or individual.
          </p>
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