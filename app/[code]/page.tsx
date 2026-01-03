"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type GameState = {
  gameId: string;
  code: string;
  status: "lobby" | "revealed" | "cleared";
  revealOrder: string[] | null;
  revealIndex: number;
  players: { id: string; display_name: string }[];
  playerCount: number;
  submittedCount: number;
};

function getLocal(key: string) {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function setLocal(key: string, val: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, val);
}

function isProbablyMobile() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

function getOrCreateClientId() {
  const key = "namegame_clientId";
  const existing = getLocal(key);
  if (existing) return existing;

  // simple unique id (good enough for this app)
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? (crypto as any).randomUUID()
      : `cid_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

  setLocal(key, id);
  return id;
}

export default function GamePage() {
  const pathname = usePathname();

  const code = useMemo(() => {
    const raw = (pathname || "/").split("/")[1] || "";
    return raw.toUpperCase();
  }, [pathname]);

  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // ✅ NEW: ref used to detect "click outside" properly
  const shareMenuRef = useRef<HTMLDivElement | null>(null);

  // Local-only toggle
  const [showFullRevealList, setShowFullRevealList] = useState(false);

  // Join + Submit inputs
  const [joinName, setJoinName] = useState("");
  const [secretName, setSecretName] = useState("");

  // Read local storage values (but ALSO update reactively after join)
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);

  const isHost = !!hostToken;

  function syncLocalFromStorage() {
    setPlayerId(getLocal(`namegame_playerId_${code}`));
    setDisplayName(getLocal(`namegame_displayName_${code}`));
    setHostToken(getLocal(`namegame_hostToken_${code}`));
  }

  useEffect(() => {
    if (!code) return;
    syncLocalFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1500);
  }

  async function copyToClipboard(value: string, successMsg: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMsg);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);

      if (ok) showToast(successMsg);
      else setError("Could not copy. Please copy manually.");
    }
  }

  const fullLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return state?.code ? `${window.location.origin}/${state.code}` : "";
  }, [state?.code]);

  const qrUrl = useMemo(() => {
    if (!fullLink) return "";
    const data = encodeURIComponent(fullLink);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${data}`;
  }, [fullLink]);

  async function shareGameOrOpenMenu() {
    if (!state) return;

    const url = `${window.location.origin}/${state.code}`;
    const shareData = {
      title: "The Name Game",
      text: `Join my Name Game! Code: ${state.code}`,
      url,
    };

    const navAny = navigator as any;
    const mobile = isProbablyMobile();

    if (mobile && typeof navAny.share === "function") {
      try {
        if (!navAny.canShare || navAny.canShare(shareData)) {
          await navAny.share(shareData);
          showToast("Shared!");
          return;
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }

      await copyToClipboard(url, "Link copied!");
      return;
    }

    setShareMenuOpen((v) => {
      const next = !v;
      if (next) setShowQR(false);
      return next;
    });
  }

  async function refresh() {
    setError(null);
    try {
      const res = await fetch(
        `/api/game/state?code=${encodeURIComponent(code)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to load game");
      setState(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!code) return;
    refresh();
    const t = setInterval(refresh, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // ✅ FIXED: Close share menu ONLY if click is OUTSIDE the share menu
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (shareMenuRef.current && target && shareMenuRef.current.contains(target)) {
        return; // click inside the share menu -> do nothing
      }
      setShareMenuOpen(false);
      setShowQR(false);
    }

    if (shareMenuOpen) {
      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }
  }, [shareMenuOpen]);

  // ESC closes share menu
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShareMenuOpen(false);
        setShowQR(false);
      }
    }
    if (shareMenuOpen) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [shareMenuOpen]);

  // When reveal starts, default everyone to hidden full list
  useEffect(() => {
    if (state?.status === "revealed") setShowFullRevealList(false);
  }, [state?.status]);

  async function joinThisGame() {
    if (!state?.code) return;
    const name = joinName.trim();
    if (name.length < 2) {
      setError("Enter your name to join.");
      return;
    }

    setBusy("join");
    setError(null);

    try {
      const clientId = getOrCreateClientId();

      const res = await fetch("/api/game/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: state.code, displayName: name, clientId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Join failed");

      // Persist for this device
      setLocal(`namegame_gameId_${state.code}`, String(data.gameId));
      setLocal(`namegame_playerId_${state.code}`, String(data.playerId));
      setLocal(`namegame_displayName_${state.code}`, name);

      // Update local state immediately
      setPlayerId(String(data.playerId));
      setDisplayName(name);

      // Clear join input and refresh
      setJoinName("");
      await refresh();
      showToast("Joined!");
    } catch (e: any) {
      setError(e?.message ?? "Join failed");
    } finally {
      setBusy(null);
    }
  }

  async function submitSecret() {
    if (!state?.gameId || !playerId) {
      setError("Join the game first.");
      return;
    }
    if (state.status !== "lobby") {
      setError("Submissions are closed for this round.");
      return;
    }

    const text = secretName.trim();
    if (text.length < 2) return setError("Enter a name to submit.");

    setBusy("submit");
    setError(null);

    try {
      const res = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: state.gameId, playerId, text }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Submit failed");

      setSecretName("");
      await refresh();
      showToast("Submitted!");
    } catch (e: any) {
      setError(e?.message ?? "Submit failed");
    } finally {
      setBusy(null);
    }
  }

  async function hostAction(path: "reveal" | "clear" | "new-round") {
    if (!state?.gameId || !hostToken) return;

    setBusy(path);
    setError(null);

    try {
      const res = await fetch(`/api/game/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: state.gameId, hostToken }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Host action failed");

      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Host action failed");
    } finally {
      setBusy(null);
    }
  }

  async function hostStep(dir: "next" | "prev" | "reset") {
    if (!state?.gameId || !hostToken) return;

    setBusy(`step-${dir}`);
    setError(null);

    try {
      const res = await fetch("/api/game/reveal-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: state.gameId, hostToken, dir }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Step failed");

      await refresh();
    } catch (e: any) {
      setError(e?.message ?? "Step failed");
    } finally {
      setBusy(null);
    }
  }

  if (!code) {
    return (
      <main className="min-h-screen p-6">
        <Link className="underline" href="/">
          ← Home
        </Link>
        <div className="mt-4 text-red-700">Missing game code in the URL.</div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-gray-600">Loading…</div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-screen p-6 space-y-4">
        <Link className="underline" href="/">
          ← Back
        </Link>
        <div className="text-red-700">{error ?? "Could not load game."}</div>
      </main>
    );
  }

  const canReveal =
    isHost &&
    state.status === "lobby" &&
    state.playerCount >= 2 &&
    state.submittedCount === state.playerCount;

  const list = state.revealOrder ?? [];
  const total = list.length;

  const safeIndex =
    total > 0 ? Math.min(Math.max(state.revealIndex ?? 0, 0), total - 1) : 0;

  const currentName = total > 0 ? list[safeIndex] : "";

  const atStart = safeIndex <= 0;
  const atEnd = total === 0 ? true : safeIndex >= total - 1;

  const needsJoin = !playerId;

  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-4">
        {/* Top bar with Share + menu */}
        <div className="flex items-center justify-between gap-3">
          <Link className="underline text-sm" href="/">
            ← Home
          </Link>

          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">
              Code:{" "}
              <span className="font-semibold tracking-widest">{state.code}</span>
            </div>

            {isHost && (
  // ✅ wrap Share button + menu in a ref container
  <div ref={shareMenuRef} className="relative flex items-center gap-2">
    {/* Share button: on mobile this opens the native share sheet (Messages, etc.) */}
    <button
      onClick={shareGameOrOpenMenu}
      disabled={busy !== null}
      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
    >
      Share
    </button>

    {/* NEW: QR button that ALWAYS opens the in-app QR panel (mobile + desktop) */}
    <button
      onClick={() => {
        setShareMenuOpen(true);
        setShowQR(true);
      }}
      disabled={busy !== null}
      className="rounded-lg border px-3 py-1 text-sm disabled:opacity-50"
    >
      QR
    </button>

    {shareMenuOpen && (
      <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-white shadow">
        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          onClick={async () => {
            setShareMenuOpen(false);
            setShowQR(false);
            await copyToClipboard(state.code, "Code copied!");
          }}
        >
          Copy code
        </button>

        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          onClick={async () => {
            setShareMenuOpen(false);
            setShowQR(false);
            await copyToClipboard(fullLink, "Link copied!");
          }}
        >
          Copy link
        </button>

        <button
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
          onClick={() => setShowQR((v) => !v)}
        >
          {showQR ? "Hide QR code" : "Show QR code"}
        </button>

        {showQR && (
          <div className="border-t p-3 space-y-2">
            <div className="text-xs text-gray-600">Scan to join</div>
            {qrUrl ? (
              <img
                src={qrUrl}
                alt="QR code to join"
                className="mx-auto"
                width={200}
                height={200}
              />
            ) : (
              <div className="text-sm text-gray-600">QR not ready yet.</div>
            )}
            <div className="text-xs text-gray-600 break-all">{fullLink}</div>
            <button
              className="w-full rounded-lg border px-3 py-2 text-sm"
              onClick={async () => {
                await copyToClipboard(fullLink, "Link copied!");
              }}
            >
              Copy link
            </button>
            <div className="text-[11px] text-gray-500">
              Tip: Press <span className="font-semibold">Esc</span> to close this
              menu.
            </div>
          </div>
        )}
      </div>
    )}
  </div>
)}

          </div>
        </div>

        {toast && (
          <div className="rounded-lg border bg-white p-2 text-sm text-center">
            {toast}
          </div>
        )}

        <div className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">
              {state.status === "lobby" && "Lobby"}
              {state.status === "revealed" && "Reveal"}
              {state.status === "cleared" && "Go!"}
            </h1>
            {isHost && (
              <span className="text-xs rounded-full bg-black text-white px-2 py-1">
                HOST
              </span>
            )}
          </div>

          {displayName && (
            <div className="text-sm text-gray-600">You: {displayName}</div>
          )}

          <div className="text-sm text-gray-700">
            Submissions:{" "}
            <span className="font-semibold">{state.submittedCount}</span> /{" "}
            {state.playerCount}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        {/* JOIN BOX */}
        {needsJoin && (
          <div className="rounded-xl border p-4 space-y-3">
            <div className="font-semibold">Join this game</div>
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-lg border p-3"
            />
            <button
              onClick={joinThisGame}
              disabled={busy !== null}
              className="w-full rounded-lg bg-black text-white py-3 font-semibold disabled:opacity-50"
            >
              {busy === "join" ? "Joining..." : "Join"}
            </button>
            <div className="text-xs text-gray-600">
              After joining, you’ll be able to submit your secret name.
            </div>
          </div>
        )}

        {/* Lobby */}
        {state.status === "lobby" && (
          <div className="rounded-xl border p-4 space-y-4">
            <div>
              <h2 className="font-semibold">Players</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {state.players.map((p) => (
                  <li key={p.id} className="flex items-center justify-between">
                    <span>{p.display_name}</span>
                    {p.id === playerId && (
                      <span className="text-xs text-gray-500">you</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {!needsJoin ? (
              <div className="space-y-2">
                <h2 className="font-semibold">Submit your secret name</h2>
                <input
                  value={secretName}
                  onChange={(e) => setSecretName(e.target.value)}
                  placeholder="e.g., Abraham Lincoln"
                  className="w-full rounded-lg border p-3"
                />
                <button
                  onClick={submitSecret}
                  disabled={busy !== null}
                  className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold disabled:opacity-50"
                >
                  {busy === "submit" ? "Submitting..." : "Submit"}
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-600">
                Join above to submit your secret name.
              </div>
            )}

            {isHost ? (
              <button
                onClick={() => hostAction("reveal")}
                disabled={!canReveal || busy !== null}
                className="w-full rounded-lg bg-black text-white py-3 font-semibold disabled:opacity-40"
              >
                {busy === "reveal" ? "Revealing..." : "Reveal (host)"}
              </button>
            ) : (
              <div className="text-xs text-gray-600">
                Waiting for the host to reveal once everyone has submitted.
              </div>
            )}

            {isHost && !canReveal && (
              <div className="text-xs text-gray-600">
                Reveal becomes available when everyone has submitted (and there
                are at least 2 players).
              </div>
            )}
          </div>
        )}

        {/* Revealed */}
        {state.status === "revealed" && (
          <div className="rounded-xl border p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Read this list twice</h2>
              <div className="text-sm text-gray-600">
                {total > 0 ? `${safeIndex + 1} / ${total}` : "0 / 0"}
              </div>
            </div>

            {isHost ? (
              <button
                onClick={() => hostStep("next")}
                className="w-full rounded-2xl border p-6 text-center active:scale-[0.99]"
                disabled={total === 0 || atEnd || busy !== null}
                title="Tap to advance"
              >
                <div className="text-xs text-gray-500 mb-2">Tap to advance</div>
                <div className="text-3xl font-bold leading-snug break-words">
                  {total > 0 ? currentName : "No names to show"}
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  {total > 0 && atEnd ? "End of list" : "Next →"}
                </div>
              </button>
            ) : (
              <div className="w-full rounded-2xl border p-6 text-center">
                <div className="text-xs text-gray-500 mb-2">
                  Host is advancing the list…
                </div>
                <div className="text-3xl font-bold leading-snug break-words">
                  {total > 0 ? currentName : "Waiting for names…"}
                </div>
              </div>
            )}

            {isHost ? (
              <div className="flex gap-2">
                <button
                  onClick={() => hostStep("prev")}
                  disabled={total === 0 || atStart || busy !== null}
                  className="flex-1 rounded-lg border py-3 text-sm font-semibold disabled:opacity-50"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => hostStep("next")}
                  disabled={total === 0 || atEnd || busy !== null}
                  className="flex-1 rounded-lg border py-3 text-sm font-semibold disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            ) : (
              <div className="text-xs text-gray-600 text-center">
                Follow along on the host’s screen.
              </div>
            )}

            <button
              onClick={() => setShowFullRevealList((v) => !v)}
              className="w-full rounded-lg border py-3 text-sm"
            >
              {showFullRevealList ? "Hide full list" : "Show full list"}
            </button>

            {showFullRevealList && (
              <ol className="list-decimal pl-5 space-y-1">
                {list.map((n, i) => (
                  <li key={`${n}-${i}`} className="text-base">
                    {n}
                  </li>
                ))}
              </ol>
            )}

            {isHost && (
              <button
                onClick={() => hostAction("clear")}
                disabled={busy !== null}
                className="w-full rounded-lg bg-black text-white py-3 font-semibold disabled:opacity-50"
              >
                {busy === "clear" ? "Clearing..." : "Clear list (start guessing)"}
              </button>
            )}
          </div>
        )}

        {/* Cleared */}
        {state.status === "cleared" && (
          <div className="rounded-xl border p-6 space-y-4 text-center">
            <div className="text-2xl font-bold">List cleared.</div>
            <div className="text-gray-700">Start guessing!</div>

            {isHost && (
              <button
                onClick={() => hostAction("new-round")}
                disabled={busy !== null}
                className="w-full rounded-lg bg-black text-white py-3 font-semibold disabled:opacity-50"
              >
                {busy === "new-round" ? "Resetting..." : "New round"}
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
