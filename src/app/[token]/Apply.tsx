"use client";

import { useState, useTransition } from "react";
import type { ProfileContext, TailoredResume } from "@/lib/types";
import type { TraceIssue } from "@/lib/validate";
import type { FormQA } from "@/lib/googleForm";
import { generateAction, googleFormAnswersAction } from "../actions";

type Channel = "email" | "dm" | "form";

const card =
  "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";

export function Apply({
  token,
  profile,
  hasVoice,
}: {
  token: string;
  profile: ProfileContext;
  hasVoice: boolean;
}) {
  const [channel, setChannel] = useState<Channel | null>(null);

  const profileEmpty =
    !profile.name && profile.projects.length === 0 && profile.experiences.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Apply</h1>
        <p className="text-sm text-neutral-500">
          How are you applying? We&apos;ll tailor everything to that channel.
        </p>
      </div>

      {profileEmpty && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-950/40">
          Your profile is empty, output will be thin. Add your resume or details first.
        </p>
      )}

      {/* Step 1: pick channel */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            { id: "email", t: "Cold email", d: "To a recruiter or hiring manager" },
            { id: "dm", t: "LinkedIn DM", d: "A short, punchy outreach message" },
            { id: "form", t: "Google Form", d: "Answer an application form" },
          ] as { id: Channel; t: string; d: string }[]
        ).map((c) => (
          <button
            key={c.id}
            onClick={() => setChannel(c.id)}
            className={`rounded-2xl border p-5 text-left transition ${
              channel === c.id
                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
                : "border-neutral-200 bg-white hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900"
            }`}
          >
            <div className="font-semibold">{c.t}</div>
            <div
              className={`mt-1 text-xs ${
                channel === c.id ? "opacity-80" : "text-neutral-500"
              }`}
            >
              {c.d}
            </div>
          </button>
        ))}
      </div>

      {/* Step 2 */}
      {channel === "form" ? (
        <FormFlow token={token} />
      ) : channel ? (
        <OutreachFlow token={token} channel={channel} hasVoice={hasVoice} />
      ) : null}
    </div>
  );
}

// Email / DM: paste JD -> message; and tailor a resume for the role (modal).
function OutreachFlow({
  token,
  channel,
  hasVoice,
}: {
  token: string;
  channel: "email" | "dm";
  hasVoice: boolean;
}) {
  const [jd, setJd] = useState("");
  const [busy, start] = useTransition();
  const [prose, setProse] = useState("");
  const [issues, setIssues] = useState<TraceIssue[]>([]);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  // tailored resume modal
  const [resBusy, startRes] = useTransition();
  const [tailored, setTailored] = useState<TailoredResume | null>(null);
  const [resIssues, setResIssues] = useState<TraceIssue[]>([]);
  const [modal, setModal] = useState(false);

  function write() {
    start(async () => {
      setNote("");
      setProse("");
      const res = await generateAction(token, channel, jd);
      if (!res.ok || !res.result) return setNote(res.note ?? "Failed.");
      setProse(res.result.output as string);
      setIssues(res.result.issues);
    });
  }

  function tailorResume() {
    startRes(async () => {
      setNote("");
      const res = await generateAction(token, "resume", jd);
      if (!res.ok || !res.result) return setNote(res.note ?? "Failed.");
      setTailored(res.result.output as TailoredResume);
      setResIssues(res.result.issues);
      setModal(true);
    });
  }

  async function download() {
    if (!tailored) return;
    const res = await fetch(`/${token}/resume.pdf`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tailored),
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume_tailored.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className={card}>
      <h2 className="mb-2 font-semibold">Paste the job description</h2>
      <textarea
        className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
        rows={6}
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the JD or the role details here…"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={write}
          disabled={busy}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Writing…" : channel === "email" ? "Write email" : "Write DM"}
        </button>
        <button
          onClick={tailorResume}
          disabled={resBusy}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
        >
          {resBusy ? "Tailoring…" : "Tailor my resume for this role"}
        </button>
      </div>
      {!hasVoice && (
        <p className="mt-2 text-xs text-neutral-400">
          Tip: add a voice sample in Profile so this sounds like you.
        </p>
      )}
      {note && <p className="mt-2 text-sm text-red-600">{note}</p>}

      {issues.length > 0 && (
        <FlagList issues={issues} />
      )}

      {prose && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              {channel === "email" ? "Email" : "LinkedIn DM"} — edit before sending
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(prose);
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
              }}
              className="rounded-lg bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <textarea
            className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
            rows={10}
            value={prose}
            onChange={(e) => setProse(e.target.value)}
          />
        </div>
      )}

      {/* Tailored resume popup */}
      {modal && tailored && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-neutral-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Role-specific resume ready</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Your real experience, reordered and filtered for this role. Nothing invented.
            </p>
            <div className="mt-4 space-y-1 text-sm">
              <p>
                <span className="text-neutral-500">Projects:</span>{" "}
                {tailored.orderedProjectNames.join(", ") || "—"}
              </p>
              <p>
                <span className="text-neutral-500">Skills:</span>{" "}
                {tailored.includedSkillNames.slice(0, 8).join(", ") || "—"}
              </p>
            </div>
            {resIssues.length > 0 && <FlagList issues={resIssues} />}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setModal(false)}
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
              >
                Close
              </button>
              <button
                onClick={download}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function FormFlow({ token }: { token: string }) {
  const [url, setUrl] = useState("");
  const [busy, start] = useTransition();
  const [answers, setAnswers] = useState<FormQA[]>([]);
  const [note, setNote] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function run() {
    start(async () => {
      setNote("");
      setAnswers([]);
      const res = await googleFormAnswersAction(token, url);
      if (!res.ok) return setNote(res.note ?? "Couldn't read that form.");
      setAnswers(res.answers ?? []);
    });
  }

  return (
    <section className={card}>
      <h2 className="mb-1 font-semibold">Paste the Google Form link</h2>
      <p className="mb-3 text-sm text-neutral-400">
        We read the questions and draft answers in your voice. Public forms only.
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
          placeholder="https://docs.google.com/forms/d/e/…/viewform"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={run}
          disabled={busy}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {busy ? "Reading…" : "Draft answers"}
        </button>
      </div>
      {note && <p className="mt-2 text-sm text-red-600">{note}</p>}

      {answers.length > 0 && (
        <div className="mt-4 space-y-4">
          {answers.map((qa, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <p className="mb-1 text-sm font-semibold">{qa.question}</p>
              <textarea
                className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
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

function FlagList({ issues }: { issues: TraceIssue[] }) {
  return (
    <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
      <p className="font-medium">
        {issues.length} item(s) not found in your profile — review before sending:
      </p>
      <ul className="mt-1 list-disc pl-5">
        {issues.map((i, n) => (
          <li key={n}>
            <strong>{i.value}</strong> — {i.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
