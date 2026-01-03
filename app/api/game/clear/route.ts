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

export async function POST(req: Request) {
  const { gameId, hostToken } = await req.json();

  if (!gameId || !hostToken) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const auth = await verifyHost(String(gameId), String(hostToken));
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const { error: uErr } = await supabaseService
    .from("games")
    .update({ status: "cleared", reveal_order: null })
    .eq("id", gameId);

  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
