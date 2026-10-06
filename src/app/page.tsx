import { HomeActions } from "@/components/home-actions";

const STEPS = [
  ["Start a room", "Open Party DJ on the laptop or TV that plays the music."],
  ["Guests scan the code", "No app and no sign-up. It opens in the phone's browser."],
  ["The crowd picks", "Everyone adds songs and votes. The most wanted song plays next."],
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-12 p-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <h1 className="bg-gradient-to-r from-fuchsia-300 to-violet-300 bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl">
          Party DJ
        </h1>
        <p className="max-w-md text-lg text-white/70">
          One shared queue for the whole party. Your guests choose the music from their phones.
        </p>
      </div>

      <HomeActions />

      <ol className="grid max-w-3xl gap-4 text-left sm:grid-cols-3">
        {STEPS.map(([title, text], index) => (
          <li key={title} className="rounded-2xl bg-white/5 p-4">
            <p className="font-mono text-sm text-fuchsia-300">0{index + 1}</p>
            <p className="mt-1 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-white/60">{text}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
