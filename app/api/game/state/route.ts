import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();

  if (!code || code.length !== 4) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const { data: game, error: gErr } = await supabaseService
    .from("games")
    .select("id, code, status, reveal_order, reveal_index")
    .eq("code", code)
    .single();

  if (gErr || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const { data: players, error: pErr } = await supabaseService
    .from("players")
    .select("id, display_name")
    .eq("game_id", game.id)
    .order("created_at", { ascending: true });

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const { data: submissions, error: sErr } = await supabaseService
    .from("submissions")
    .select("id")
    .eq("game_id", game.id);

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({
  gameId: game.id,
  code: game.code,
  status: game.status,
  revealOrder: game.reveal_order ?? null,
  revealIndex: game.reveal_index ?? 0,
  players: players ?? [],
  playerCount: (players ?? []).length,
  submittedCount: (submissions ?? []).length,
});

}
