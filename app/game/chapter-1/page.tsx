import type { Metadata } from "next";
import ChapterGameClient from "./ChapterGameClient";

export const metadata: Metadata = { title: "Chapter 1 — The Boy with the Paper Sun | DWARKA", description: "Play Chapter 1 as Vrishaketu and protect the charioteers' quarter." };

function configuredWebSocketUrl(): string | null {
  const configured = process.env.DWARKA_WS_URL?.trim();
  if (!configured) return process.env.NODE_ENV === "development" ? "ws://localhost:3210" : null;
  try {
    const url = new URL(configured);
    const localDevelopment = url.protocol === "ws:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return url.protocol === "wss:" || localDevelopment ? url.href : null;
  } catch {
    return null;
  }
}

export default function ChapterOnePage() { return <ChapterGameClient websocketUrl={configuredWebSocketUrl()} />; }
