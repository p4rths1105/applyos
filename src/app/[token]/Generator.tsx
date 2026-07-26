"use client";

import { useState, useTransition } from "react";
import type { ProfileContext, TailoredResume, OutputType } from "@/lib/types";
import type { TraceIssue } from "@/lib/validate";
import { generateAction, googleFormAnswersAction } from "../actions";
import type { FormQA } from "@/lib/googleForm";
import { ResumePreview } from "./ResumePreview";

const card = "rounded-lg border border-neutral-200 p-4 dark:border-neutral-800";

export function Generator({
  token,
  profile,
  hasVoice,
}: {
  token: string;
  profile: ProfileContext;
  hasVoice: boolean;
}) {
  const [jd, setJd] = useState("");
  const [busy, start] = useTransition();
  const [type, setType] = useState<OutputType | null>(null);
  const [resume, setResume] = useState<TailoredResume | null>(null);
  const [prose, setProse] = useState("");
  const [issues, setIssues] = useState<TraceIssue[]>([]);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const profileEmpty =
    !profile.name && profile.projects.length === 0 && profile.experiences.length === 0;

  function run(t: OutputType) {
    start(async () => {
      setNote("");
      setResume(null);
      setProse("");
      setIssues([]);
      setType(t);
      const res = await generateAction(token, t, jd);
      if (!res.ok || !res.result) {
        setNote(res.note ?? "Generation failed.");
        return;
      }
      setIssues(res.result.issues);
      if (t === "resume") setResume(res.result.output as TailoredResume);
      else setProse(res.result.output as string);
    });
  }

  return (
    <div className="space-y-6">
      {profileEmpty && (
        <p className="rounded bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40">
          Your profile looks empty. Fill in the Profile tab first, or output will be thin.
        </p>
      )}

      <section className={card}>
        <h2 className="mb-2 font-semibold">Paste the job description</h2>
        <textarea
          className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          rows={6}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the JD or recruiter message here…"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <GenBtn onClick={() => run("resume")} disabled={busy}>
            {busy && type === "resume" ? "Tailoring…" : "Tailor resume"}
          </GenBtn>
          <GenBtn onClick={() => run("email")} disabled={busy}>
            {busy && type === "email" ? "Writing…" : "Write email"}
          </GenBtn>
          <GenBtn onClick={() => run("dm")} disabled={busy}>
            {busy && type === "dm" ? "Writing…" : "Write LinkedIn DM"}
          </GenBtn>
        </div>
        {!hasVoice && (
          <p className="mt-2 text-xs text-neutral-400">
            Tip: add a voice sample in the Profile tab so emails sound like you.
          </p>
        )}
        {note && <p className="mt-2 text-sm text-red-600">{note}</p>}
      </section>

      {/* Flagged facts — the trust guard surfacing untraceable claims */}
      {issues.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
          <p className="mb-2 text-sm font-semibold text-red-700 dark:text-red-300">
            Review these {issues.length} flagged item(s) — not found in your profile:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-700 dark:text-red-300">
            {issues.map((i, n) => (
              <li key={n}>
                <strong>{i.value}</strong> — {i.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resume result */}
      {resume && (
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Tailored resume — review, then export</h2>
            <button
              onClick={() => window.print()}
              className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
            >
              Download / Print to PDF
            </button>
          </div>
          <p className="mb-3 text-xs text-neutral-400">
            Only your real projects/skills, reordered and filtered for this role. Nothing invented.
          </p>
          <ResumePreview profile={profile} resume={resume} />
        </section>
      )}

      {/* Prose result (email / DM) */}
      {prose && (
        <section className={card}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">
              {type === "email" ? "Email" : "LinkedIn DM"} — edit before sending
            </h2>
            <button
              onClick={() => {
                navigator.clipboard.writeText(prose);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <textarea
            className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            rows={10}
            value={prose}
            onChange={(e) => setProse(e.target.value)}
          />
        </section>
      )}

      <GoogleForm token={token} />
    </div>
  );
}

function GoogleForm({ token }: { token: string }) {
  const [url, setUrl] = useState("");
  const [busy, start] = useTransition();
  const [answers, setAnswers] = useState<FormQA[]>([]);
  const [issues, setIssues] = useState<TraceIssue[]>([]);
  const [note, setNote] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function run() {
    start(async () => {
      setNote("");
      setAnswers([]);
      setIssues([]);
      const res = await googleFormAnswersAction(token, url);
      if (!res.ok) {
        setNote(res.note ?? "Couldn't read that form.");
        return;
      }
      setAnswers(res.answers ?? []);
      setIssues(res.issues ?? []);
    });
  }

  return (
    <section className={card}>
      <h2 className="mb-1 font-semibold">Google Form application</h2>
      <p className="mb-3 text-sm text-neutral-400">
        Paste a public Google Form link. We read its questions and draft answers in your
        voice for you to copy in. (Works on public forms only.)
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          placeholder="https://docs.google.com/forms/d/e/…/viewform"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={run}
          disabled={busy}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Reading…" : "Draft answers"}
        </button>
      </div>
      {note && <p className="mt-2 text-sm text-red-600">{note}</p>}

      {issues.length > 0 && (
        <p className="mt-3 text-sm text-amber-600">
          {issues.length} answer(s) contain claims not found in your profile — check before submitting.
        </p>
      )}

      {answers.length > 0 && (
        <div className="mt-4 space-y-4">
          {answers.map((qa, i) => (
            <div key={i} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
              <p className="mb-1 text-sm font-semibold">{qa.question}</p>
              <textarea
                className="w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
                rows={3}
                value={qa.answer}
                onChange={(e) => {
                  const next = [...answers];
                  next[i] = { ...qa, answer: e.target.value };
                  setAnswers(next);
                }}
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qa.answer);
                  setCopiedIdx(i);
                  setTimeout(() => setCopiedIdx(null), 1200);
                }}
                className="mt-1 text-xs text-blue-600 hover:underline"
              >
                {copiedIdx === i ? "Copied ✓" : "Copy answer"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GenBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
    >
      {children}
    </button>
  );
}
