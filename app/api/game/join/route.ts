import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  const { code, displayName, clientId } = await req.json();

  if (!code || !displayName || !clientId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: game, error: gErr } = await supabaseService
    .from("games")
    .select("id")
    .eq("code", String(code).toUpperCase())
    .single();

  if (gErr || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const { data: player, error: pErr } = await supabaseService
    .from("players")
    .upsert(
      {
        game_id: game.id,
        client_id: String(clientId),
        display_name: String(displayName),
      },
      { onConflict: "game_id,client_id" }
    )
    .select("id")
    .single();

  if (pErr || !player) {
    return NextResponse.json({ error: pErr?.message ?? "Join failed" }, { status: 500 });
  }

  return NextResponse.json({ gameId: game.id, playerId: player.id });
}

