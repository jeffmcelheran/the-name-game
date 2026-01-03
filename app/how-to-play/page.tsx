import Link from "next/link";

export default function HowToPlayPage() {
  return (
    <main className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-xl space-y-4">
        <div className="flex items-center justify-between">
          <Link className="underline text-sm" href="/">
            ← Back
          </Link>
          <div className="text-sm text-gray-600">The Name Game</div>
        </div>

        <div className="rounded-xl border p-5 space-y-3">
          <h1 className="text-2xl font-bold">The Name Game</h1>

<p className="text-gray-700">
  Here’s how to play:
</p>

<div className="space-y-4 text-gray-700">
  <p>
    <span className="font-semibold">1.</span> Everyone enters the name of a person who will be familiar to most people in the group.
    This can be a historical figure, fictional character, celebrity, or even someone in the room.
  </p>

  <p>
    <span className="font-semibold">2.</span> The <span className="font-semibold">Host</span> reads all of the names slowly,
    <span className="font-semibold">two times through</span>, in the same order.
    After that, the list is cleared.
    This is the only time the names will be read, so everyone should listen carefully and try to remember all of them.
  </p>

  <p>
    <span className="font-semibold">3.</span> The <span className="font-semibold">youngest person</span> starts the game.
    They try to match <span className="font-semibold">one name</span> to the person in the room who submitted it.
  </p>

  <p>
    <span className="font-semibold">4.</span> If the guess is <span className="font-semibold">correct</span>,
    the guesser becomes a <span className="font-semibold">team leader</span>,
    and the person whose name was guessed joins their team.
    Together, they make the next guess using their combined knowledge.
  </p>

  <p>
    <span className="font-semibold">5.</span> If the guess is <span className="font-semibold">wrong</span>,
    the person to the guesser’s right takes the next turn.
  </p>

  <p>
    <span className="font-semibold">6.</span> Over time, teams will consolidate.
    If a team leader correctly matches a name submitted by another team leader,
    <span className="font-semibold">that entire team</span> joins the guessing team.
  </p>

  <p>
    <span className="font-semibold">7.</span> Play continues until only one person or one team remains.
    That person or team wins the game.
  </p>
</div>

          </ul>
        </div>
      </div>
    </main>
  );
}
