import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { gameId, playerId, text } = await req.json();

  if (!gameId || !playerId || !text) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const cleaned = String(text).trim();
  if (cleaned.length < 2 || cleaned.length > 80) {
    return NextResponse.json({ error: "Name must be 2–80 characters." }, { status: 400 });
  }

  // Ensure player belongs to the game (basic safety)
  const { data: player, error: pErr } = await supabaseService
    .from("players")
    .select("id, game_id")
    .eq("id", playerId)
    .single();

  if (pErr || !player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  if (player.game_id !== gameId) {
    return NextResponse.json({ error: "Player does not belong to this game." }, { status: 403 });
  }

  // One submission per player per game (upsert)
  const { error: sErr } = await supabaseService
    .from("submissions")
    .upsert(
      { game_id: gameId, player_id: playerId, submitted_text: cleaned },
      { onConflict: "game_id,player_id" }
    );

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
