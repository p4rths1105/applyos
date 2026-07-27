import Link from "next/link";
import { cookies } from "next/headers";
import { Brand } from "./Brand";
import { ResumeUploadCTA } from "./ResumeUploadCTA";

export default async function Home() {
  const token = (await cookies()).get("applyos_token")?.value;

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Brand />
          <nav className="flex items-center gap-6 text-sm">
            <a href="#how" className="hidden text-neutral-500 hover:text-neutral-900 sm:block dark:hover:text-white">How it works</a>
            <a href="#features" className="hidden text-neutral-500 hover:text-neutral-900 sm:block dark:hover:text-white">Features</a>
            {token ? (
              <Link href={`/${token}`} className="rounded-lg bg-black px-4 py-2 font-medium text-white dark:bg-white dark:text-black">
                Open my workspace →
              </Link>
            ) : null}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="animate-blob absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-indigo-300/30 blur-3xl dark:bg-indigo-600/20" />
          <div className="animate-blob-2 absolute top-10 right-1/4 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl dark:bg-amber-500/10" />
        </div>
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
          <p className="animate-rise mb-4 inline-block rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-500 dark:border-neutral-800">
            For students who apply to internships constantly
          </p>
          <h1 className="animate-rise max-w-3xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-6xl">
            Every resume, email, and form answer,{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-amber-500 bg-clip-text text-transparent">
              in your voice
            </span>
            , in minutes.
          </h1>
          <p className="animate-rise-2 mt-6 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
            Keep your profile updated once. ApplyOS tailors a role-specific resume,
            writes your outreach, and even drafts Google Form answers, grounded in your
            real experience. Nothing invented.
          </p>
          <div className="animate-rise-2 mt-9">
            <ResumeUploadCTA />
            <p className="mt-3 text-sm text-neutral-400">
              Drop your resume and we&apos;ll fill your profile automatically. No sign-up.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              { n: "1", t: "Build your profile once", d: "Upload your resume or type it in. Add new experience anytime — it stays your single source of truth." },
              { n: "2", t: "Paste the role", d: "Drop a job description or a Google Form link. ApplyOS reads what the role wants." },
              { n: "3", t: "Get tailored output", d: "A role-specific resume, a cold email or DM, or filled form answers — all in your voice, ready to review and send." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-bold text-white dark:bg-white dark:text-black">{s.n}</div>
                <h3 className="mt-4 font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold tracking-tight">What makes it different</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {[
              { t: "Your voice, not AI boilerplate", d: "Paste a few real messages and every email and DM sounds like you wrote it." },
              { t: "Never invents anything", d: "A built-in check flags any fact that isn't in your profile before it ever reaches a recruiter." },
              { t: "One profile, many resumes", d: "Reorders and filters your real experience per role. Your master resume updates as you grow." },
              { t: "Google Forms too", d: "Paste a form link and get thoughtful answers to copy in, not one-word blanks." },
            ].map((f) => (
              <div key={f.t} className="rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
                <h3 className="font-semibold">{f.t}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-sm text-neutral-400">
          <Brand size={20} />
          <span>Built for the people who apply, a lot.</span>
        </div>
      </footer>
    </div>
  );
}
