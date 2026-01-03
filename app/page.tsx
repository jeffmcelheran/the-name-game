"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";


/**
 * Use sessionStorage so each browser TAB counts as a separate player.
 * This allows testing multiple players on one computer.
 */
function getOrCreateClientId() {
  if (typeof window === "undefined") return "";
  const key = "namegame_client_id";

  let v = sessionStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    sessionStorage.setItem(key, v);
  }
  return v;
}

export default function HomePage() {
  const router = useRouter();
  const clientId = useMemo(() => getOrCreateClientId(), []);

  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState<"start" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ----------------------------
  // Start game (host)
  // ----------------------------
  async function startGame() {
    setError(null);
    setBusy("start");

    try {
      const name = displayName.trim();
      if (name.length < 2) {
        throw new Error("Enter your name (as host) first.");
      }

      // 1) Create game
      const res = await fetch("/api/game/create", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to create game");

      const code = String(data.code).toUpperCase();
      const hostToken = String(data.hostToken);

      // Store host token
      localStorage.setItem(`namegame_hostToken_${code}`, hostToken);

      // 2) Auto-join host
      const joinRes = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          displayName: name,
          clientId,
        }),
      });

      const joinData = await joinRes.json();
      if (!joinRes.ok) {
        throw new Error(joinData?.error ?? "Failed to join as host");
      }

      localStorage.setItem(`namegame_gameId_${code}`, joinData.gameId);
      localStorage.setItem(`namegame_playerId_${code}`, joinData.playerId);
      localStorage.setItem(`namegame_displayName_${code}`, name);

      router.push(`/${code}`);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  // ----------------------------
  // Join existing game
  // ----------------------------
  async function joinGame() {
    setError(null);
    setBusy("join");

    try {
      const code = joinCode.trim().toUpperCase();
      const name = displayName.trim();

      if (code.length !== 4) throw new Error("Enter a 4-character game code.");
      if (name.length < 2) throw new Error("Enter your name.");

      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          displayName: name,
          clientId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to join game");

      localStorage.setItem(`namegame_gameId_${code}`, data.gameId);
      localStorage.setItem(`namegame_playerId_${code}`, data.playerId);
      localStorage.setItem(`namegame_displayName_${code}`, name);

      router.push(`/${code}`);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  // ----------------------------
  // UI
  // ----------------------------
  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        <h1 className="text-3xl font-bold">The Name Game</h1>

        {/* Start a game */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-xl font-semibold">Start a game</h2>

          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name (host)"
            className="w-full rounded-lg border p-3"
          />

          <button
            onClick={startGame}
            disabled={busy !== null}
            className="w-full rounded-lg bg-black text-white py-3 font-semibold disabled:opacity-50"
          >
            {busy === "start" ? "Starting..." : "Start a game"}
          </button>

<Link href="/how-to-play" className="underline text-sm text-center block">
  How to play
</Link>

          <p className="text-sm text-gray-600">
            You’ll be the host and automatically join the game.
          </p>
        </div>

        {/* Join a game */}
        <div className="rounded-xl border p-4 space-y-3">
          <h2 className="text-xl font-semibold">Join a game</h2>

          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Game code (4 characters)"
            className="w-full rounded-lg border p-3"
            maxLength={4}
          />

          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-lg border p-3"
          />

          <button
            onClick={joinGame}
            disabled={busy !== null}
            className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold disabled:opacity-50"
          >
            {busy === "join" ? "Joining..." : "Join game"}
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <p className="text-xs text-gray-500">
          Tip: For testing multiple players on one computer, open multiple tabs.
        </p>
      </div>
    </main>
  );
}
