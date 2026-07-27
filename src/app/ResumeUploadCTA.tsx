"use client";

import { useRef, useState, useTransition } from "react";
import { createFromResumeAction, createProfileAction } from "./actions";

// Landing CTA: pick a PDF -> we create the workspace and parse it in one step
// (no separate "parse" button). Or start empty.
export function ResumeUploadCTA() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, start] = useTransition();
  const [fileName, setFileName] = useState("");

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const fd = new FormData();
    fd.append("resume", f);
    start(async () => {
      await createFromResumeAction(fd);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onPick}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="group inline-flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-3.5 text-base font-medium text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:opacity-60 dark:bg-white dark:text-black"
      >
        {busy ? (
          <>
            <Spinner /> Reading {fileName || "your resume"}…
          </>
        ) : (
          <>Add your current resume →</>
        )}
      </button>

      <form action={createProfileAction}>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl border border-neutral-300 px-6 py-3.5 text-base font-medium transition hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Start from scratch
        </button>
      </form>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}
