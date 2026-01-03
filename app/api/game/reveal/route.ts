import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";
import { sha256Hex } from "@/lib/gameUtils";

async function verifyHost(gameId: string, hostToken: string) {
  const { data: game, error } = await supabaseService
    .from("games")
    .select("id, host_token_hash")
    .eq("id", gameId)
    .single();

  if (error || !game) return { ok: false, error: "Game not found" };

  const providedHash = sha256Hex(String(hostToken));
  if (providedHash !== game.host_token_hash) return { ok: false, error: "Not authorized" };

  return { ok: true };
}

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(req: Request) {
  const { gameId, hostToken } = await req.json();

  if (!gameId || !hostToken) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const auth = await verifyHost(String(gameId), String(hostToken));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  // Fetch submissions
  const { data: subs, error: sErr } = await supabaseService
    .from("submissions")
    .select("submitted_text")
    .eq("game_id", gameId);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  const names = (subs ?? []).map((s: any) => String(s.submitted_text));
  if (names.length < 2) {
    return NextResponse.json({ error: "Need at least 2 submissions to reveal." }, { status: 400 });
  }

  const revealOrder = shuffle(names);

  // Update game state
  const { error: uErr } = await supabaseService
    .from("games")
    .update({
  status: "revealed",
  reveal_order: revealOrder,
  reveal_index: 0,
})

    .eq("id", gameId);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
