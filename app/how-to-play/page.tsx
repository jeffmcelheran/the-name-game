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
          <h1 className="text-2xl font-bold">How to play</h1>
          <p className="text-gray-700">
            Everyone submits a <span className="font-semibold">secret name</span>.
            Then the host reveals the list <span className="font-semibold">one name at a time</span>.
            Your goal is to remember the full list… then start guessing.
          </p>
        </div>

        <div className="rounded-xl border p-5 space-y-4">
          <h2 className="text-lg font-bold">1) Start a game</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>One person is the <span className="font-semibold">host</span>.</li>
            <li>The host creates a game and gets a 4-letter code.</li>
            <li>Players join using the link, code, or QR.</li>
          </ul>

          <h2 className="text-lg font-bold">2) Everyone submits a secret name</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Pick a real person (or character) everyone might know.</li>
            <li>Try to avoid duplicates.</li>
            <li>Once you submit, wait in the lobby.</li>
          </ul>

          <h2 className="text-lg font-bold">3) Reveal (read the list twice)</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>The host advances the list. Everyone stays in sync.</li>
            <li>Read each name out loud as it appears.</li>
            <li>Try to memorize the whole list.</li>
          </ul>

          <h2 className="text-lg font-bold">4) Clear the list & start guessing</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-700">
            <li>Once cleared, start guessing the names from memory.</li>
            <li>You can make your own house rules (turns, points, etc.).</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
