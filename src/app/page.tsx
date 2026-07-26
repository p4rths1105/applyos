import { createProfileAction } from "./actions";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">ApplyOS</h1>
        <p className="text-lg text-neutral-500 dark:text-neutral-400">
          Keep your profile updated once, and every resume and outreach message is
          generated in your voice, tailored to the role, in minutes.
        </p>
      </div>

      <form action={createProfileAction}>
        <button
          type="submit"
          className="rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-black"
        >
          Start &rarr; create my workspace
        </button>
      </form>

      <p className="text-sm text-neutral-400">
        You&apos;ll get a private link. Bookmark it &mdash; it&apos;s how you get back in.
      </p>
    </main>
  );
}
