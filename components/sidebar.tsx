"use client"
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  BarChart2,
  Coffee,
  Users,
  FileText,
  Sparkles,
} from "lucide-react";

import { COLORS, FONTS, NAV_ITEMS } from "../app/vars";

// map icon keys from vars.js -> lucide components
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  clock: Clock,
  "bar-chart": BarChart2,
  coffee: Coffee,
  users: Users,
  "file-text": FileText,
  sparkles: Sparkles,
};

// item.key -> route path. Adjust keys here if your NAV_ITEMS use
// different key strings than these.
const ROUTES: Record<string, string> = {
  dashboard: "/home",
  analytics: "/analytics",
  staff: "/staff",
  readme: "/readme",
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex w-full shrink-0 items-center justify-between gap-4 overflow-x-auto px-4 py-3 md:h-screen md:w-[240px] md:flex-col md:items-stretch md:justify-between md:overflow-visible md:sticky md:top-0 md:self-start md:px-5 md:py-6 lg:w-[280px]"
      style={{ backgroundColor: COLORS.bgSidebar, borderRight: `1px solid ${COLORS.border}`, borderBottom: `1px solid ${COLORS.border}` }}
    >
      <div className="flex items-center gap-6 md:block">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2 md:mb-8 md:px-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg"
            style={{ backgroundColor: COLORS.accentSoft }}
          >
            ☕
          </div>
          <span className="hidden text-lg font-semibold text-white sm:inline md:inline">Grind & Co.</span>
        </div>

        {/* Nav */}
        <nav className="flex shrink-0 gap-1 md:flex-col">
          {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const href = ROUTES[item.key] ?? "/home";
            const isActive = pathname === href;
            return (
              <Link
                key={item.key}
                href={href}
                className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition-colors md:px-4 md:py-3"
                style={{
                  backgroundColor: isActive ? COLORS.accentSoft : "transparent",
                  color: isActive ? COLORS.textPrimary : COLORS.textSecondary,
                  fontWeight: isActive ? FONTS.weightSemibold : FONTS.weightRegular,
                }}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}