"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProfileContext } from "@/lib/types";
import { importResumeAction } from "../actions";

// The master resume: always reflects the current profile, rendered as a real PDF
// by /[token]/resume.pdf. Empty state prompts the user to add one.
export function ResumeTab({
  token,
  profile,
  onGoToProfile,
}: {
  token: string;
  profile: ProfileContext;
  onGoToProfile: () => void;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  const [note, setNote] = useState("");
  const [v, setV] = useState(1); // cache-bust the PDF preview after changes

  const hasResume =
    Boolean(profile.name) &&
    (profile.experiences.length > 0 ||
      profile.projects.length > 0 ||
      profile.education.length > 0);

  function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("resume", f);
    start(async () => {
      setNote("");
      const res = await importResumeAction(token, fd);
      if (!res.ok) setNote(res.note ?? "Something went wrong.");
      else {
        setV((x) => x + 1);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={upload}
      />

      {!hasResume ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center dark:border-neutral-700 dark:bg-neutral-900">
          <h2 className="text-xl font-semibold">No resume yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
            Add your resume and we&apos;ll build your profile from it. It becomes your
            master resume and updates whenever you edit your profile.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="rounded-xl bg-black px-5 py-2.5 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black"
            >
              {busy ? "Reading…" : "Add your resume (PDF)"}
            </button>
            <button
              onClick={onGoToProfile}
              className="rounded-xl border border-neutral-300 px-5 py-2.5 font-medium dark:border-neutral-700"
            >
              Fill it in manually
            </button>
          </div>
          {note && <p className="mt-3 text-sm text-amber-600">{note}</p>}
        </div>
      ) : (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your resume</h1>
              <p className="text-sm text-neutral-500">
                Always up to date with your profile.
              </p>
            </div>
            <a
              href={`/${token}/resume.pdf?v=${v}`}
              download
              className="rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-black"
            >
              Download PDF
            </a>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800">
            <iframe
              key={v}
              src={`/${token}/resume.pdf?v=${v}`}
              className="h-[75vh] w-full"
              title="Resume preview"
            />
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium disabled:opacity-60 dark:border-neutral-700"
            >
              {busy ? "Reading…" : "Change resume (upload a new PDF)"}
            </button>
            <button
              onClick={onGoToProfile}
              className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-medium dark:border-neutral-700"
            >
              Edit details
            </button>
          </div>
          {note && <p className="mt-3 text-center text-sm text-amber-600">{note}</p>}
        </div>
      )}
    </div>
  );
}
