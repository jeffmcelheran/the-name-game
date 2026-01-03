import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseClient";
import { makeGameCode, makeToken, sha256Hex } from "@/lib/gameUtils";

export async function POST() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = makeGameCode(4);
    const hostToken = makeToken();
    const hostHash = sha256Hex(hostToken);

    const { data, error } = await supabaseService
      .from("games")
      .insert({ code, host_token_hash: hostHash, status: "lobby" })
      .select("id, code")
      .single();

    if (!error && data) {
      return NextResponse.json({ gameId: data.id, code: data.code, hostToken });
    }

    if (error && !String(error.message).toLowerCase().includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Could not create a unique game code. Try again." },
    { status: 500 }
  );
}
