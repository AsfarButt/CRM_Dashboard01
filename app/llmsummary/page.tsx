// app/llmsummary/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function LlmSummaryPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-black">
      <p className="text-sm text-zinc-400">Ask Grind AI — still under production.</p>
      <button
        onClick={() => router.push("/home")}
        className="flex items-center gap-1.5 rounded-full border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
      >
        <ArrowLeft size={14} />
        Back to Home
      </button>
    </div>
  );
}