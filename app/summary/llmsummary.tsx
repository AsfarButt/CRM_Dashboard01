"use client";

import { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/sidebar";

import {
  COLORS,
  FONTS,
} from "../vars";


type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: string[];
  timestamp: number;
};

const COOKIE_NAME = "llm_chat_session";
const COOKIE_MAX_AGE = 60 * 60 * 6; // 6 hours
const SOURCE_OPTIONS = ["Sales", "Staff", "Supply"];

function writeSessionCookie(messages: Message[]) {
  const value = encodeURIComponent(JSON.stringify(messages));
  document.cookie = `${COOKIE_NAME}=${value}; max-age=${COOKIE_MAX_AGE}; path=/`;
}

function readSessionCookie(): Message[] {
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return [];
  try {
    return JSON.parse(decodeURIComponent(match.split("=")[1])) as Message[];
  } catch {
    return [];
  }
}

export default function LlmSummary() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(readSessionCookie());
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function toggleSource(source: string) {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }

  function toggleAllSources() {
    setSelectedSources((prev) =>
      prev.length === SOURCE_OPTIONS.length ? [] : [...SOURCE_OPTIONS]
    );
  }

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      sources: selectedSources,
      timestamp: Date.now(),
    };

    writeSessionCookie([...messages, userMsg]);
    const persisted = readSessionCookie();
    setMessages(persisted);
    setInput("");

    setTimeout(() => {
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `(placeholder) Looking into ${
          selectedSources.length ? selectedSources.join(", ") : "all data"
        } for: "${trimmed}"`,
        sources: selectedSources,
        timestamp: Date.now(),
      };
      writeSessionCookie([...persisted, assistantMsg]);
      setMessages(readSessionCookie());
    }, 400);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col md:flex-row" style={{ backgroundColor: COLORS.bgApp, fontFamily: FONTS.family }}>
      <Sidebar />
      <div className="relative h-full w-full bg-black text-white font-light flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <h1 className="text-xl">YO, Wassip</h1>
            <h3 className="text-sm text-zinc-400">README Page will be displayed here</h3>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[70%] rounded-3xl px-4 py-2.5 text-sm ${
                  m.role === "user"
                    ? "self-end bg-[#e8ddce] text-zinc-900"
                    : "self-start bg-zinc-800 text-white"
                }`}
              >
                <p>{m.content}</p>
                {m.sources.length > 0 && (
                  <p className="mt-1 text-[10px] text-zinc-500">sources: {m.sources.join(", ")}</p>
                )}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}

        {/* bottom bar */}
        <div className="w-full flex justify-center px-4 pb-4 pt-2">
          <div className="w-full max-w-2xl flex flex-col gap-2">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-2xl px-3 py-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your data..."
                className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={sendMessage}
                className="text-sm bg-[#e8ddce] text-zinc-900 rounded-xl px-3 py-1.5 hover:bg-[#ddd0bd]"
              >
                Send
              </button>
            </div>

            {/* source pills */}
            <div className="flex flex-wrap gap-2 px-1">
              <button
                type="button"
                onClick={toggleAllSources}
                className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                  selectedSources.length === SOURCE_OPTIONS.length
                    ? "bg-[#e8ddce] text-zinc-900 border-[#e8ddce]"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}
              >
                Select all
              </button>
              {SOURCE_OPTIONS.map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => toggleSource(source)}
                  className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                    selectedSources.includes(source)
                      ? "bg-[#e8ddce] text-zinc-900 border-[#e8ddce]"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
                  }`}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}