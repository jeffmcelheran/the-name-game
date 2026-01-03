import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";
import { sha256Hex } from "@/lib/gameUtils";

async function verifyHost(gameId: string, hostToken: string) {
  const { data: game, error } = await supabaseService
    .from("games")
    .select("host_token_hash")
    .eq("id", gameId)
    .single();

  if (error || !game) return { ok: false };
  if (sha256Hex(String(hostToken)) !== game.host_token_hash) return { ok: false };
  return { ok: true };
}

export async function POST(req: Request) {
  const { gameId, hostToken, dir } = await req.json();

  if (!gameId || !hostToken || !dir) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const auth = await verifyHost(String(gameId), String(hostToken));
  if (!auth.ok) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  // Get current index + list length
  const { data: game, error } = await supabaseService
    .from("games")
    .select("reveal_index, reveal_order")
    .eq("id", gameId)
    .single();

  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const total = (game.reveal_order ?? []).length;
  let nextIndex = game.reveal_index ?? 0;

  if (dir === "next") nextIndex = Math.min(nextIndex + 1, total - 1);
  if (dir === "prev") nextIndex = Math.max(nextIndex - 1, 0);
  if (dir === "reset") nextIndex = 0;

  const { error: uErr } = await supabaseService
    .from("games")
    .update({ reveal_index: nextIndex })
    .eq("id", gameId);

  if (uErr) {
    return NextResponse.json({ error: uErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, revealIndex: nextIndex });
}
