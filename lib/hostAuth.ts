import { supabaseService } from "@/lib/supabaseClient";
import { sha256Hex } from "@/lib/gameUtils";

export async function assertHost(gameId: string, hostToken: string) {
  const { data: game, error } = await supabaseService
    .from("games")
    .select("host_token_hash")
    .eq("id", gameId)
    .single();

  if (error || !game) throw new Error("Game not found");

  if (sha256Hex(hostToken) !== game.host_token_hash) throw new Error("Not host");
  return true;
}
