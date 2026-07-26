"use client";

import { useRef, useState, useTransition } from "react";
import type { ProfileContext } from "@/lib/types";
import {
  parseResumeAction,
  saveProfileAction,
  extractVoiceAction,
} from "../actions";
import { ResumePreview } from "./ResumePreview";
import type { TailoredResume } from "@/lib/types";

type Editable = Omit<ProfileContext, "voiceProfile">;

const input =
  "w-full rounded border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700";
const label = "block text-xs font-medium text-neutral-500 mb-1";
const card = "rounded-lg border border-neutral-200 p-4 dark:border-neutral-800";

export function ProfileEditor({
  token,
  profile,
  hasVoice,
  onChange,
  onVoiceSaved,
}: {
  token: string;
  profile: ProfileContext;
  hasVoice: boolean;
  onChange: (p: ProfileContext) => void;
  onVoiceSaved: () => void;
}) {
  const [saving, startSave] = useTransition();
  const [parsing, startParse] = useTransition();
  const [savedMsg, setSavedMsg] = useState("");
  const [parseNote, setParseNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Editable>) => onChange({ ...profile, ...patch });

  function uploadResume(form: FormData) {
    startParse(async () => {
      setParseNote("");
      const res = await parseResumeAction(token, form);
      if (res.note) setParseNote(res.note);
      if (res.ok) {
        // Merge draft into current profile so the user reviews before saving.
        onChange({ ...profile, ...res.draft, voiceProfile: profile.voiceProfile });
        setParseNote("Parsed. Review everything below, then Save.");
      }
    });
  }

  function save() {
    startSave(async () => {
      setSavedMsg("");
      const { voiceProfile, ...editable } = profile;
      void voiceProfile;
      await saveProfileAction(token, editable);
      setSavedMsg("Saved.");
    });
  }

  return (
    <div className="space-y-6">
      {/* Resume upload */}
      <section className={card}>
        <h2 className="mb-2 font-semibold">1. Upload your resume (optional)</h2>
        <p className="mb-3 text-sm text-neutral-400">
          We extract the text and pre-fill the fields. You review everything before saving.
        </p>
        <form action={uploadResume} className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            name="resume"
            accept="application/pdf"
            className="text-sm"
          />
          <button
            type="submit"
            disabled={parsing}
            className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {parsing ? "Parsing…" : "Parse PDF"}
          </button>
        </form>
        {parseNote && <p className="mt-2 text-sm text-amber-600">{parseNote}</p>}
      </section>

      {/* Basics */}
      <section className={card}>
        <h2 className="mb-3 font-semibold">2. Basics</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={label}>Name</label>
            <input
              className={input}
              value={profile.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </div>
          <div>
            <label className={label}>Email</label>
            <input
              className={input}
              value={profile.contact.email ?? ""}
              onChange={(e) =>
                set({ contact: { ...profile.contact, email: e.target.value } })
              }
            />
          </div>
          <div>
            <label className={label}>Location</label>
            <input
              className={input}
              value={profile.contact.location ?? ""}
              onChange={(e) =>
                set({ contact: { ...profile.contact, location: e.target.value } })
              }
            />
          </div>
          <div>
            <label className={label}>GitHub</label>
            <input
              className={input}
              value={profile.links.github ?? ""}
              onChange={(e) =>
                set({ links: { ...profile.links, github: e.target.value } })
              }
            />
          </div>
          <div>
            <label className={label}>LinkedIn</label>
            <input
              className={input}
              value={profile.links.linkedin ?? ""}
              onChange={(e) =>
                set({ links: { ...profile.links, linkedin: e.target.value } })
              }
            />
          </div>
        </div>
      </section>

      {/* Experiences */}
      <ListSection
        title="3. Experience"
        items={profile.experiences}
        onAdd={() =>
          set({
            experiences: [
              ...profile.experiences,
              { title: "", org: "", dates: "", bullets: [] },
            ],
          })
        }
        onRemove={(i) =>
          set({ experiences: profile.experiences.filter((_, x) => x !== i) })
        }
        render={(exp, i) => (
          <div className="grid grid-cols-2 gap-2">
            <input
              className={input}
              placeholder="Title"
              value={exp.title}
              onChange={(e) => {
                const next = [...profile.experiences];
                next[i] = { ...exp, title: e.target.value };
                set({ experiences: next });
              }}
            />
            <input
              className={input}
              placeholder="Organisation"
              value={exp.org}
              onChange={(e) => {
                const next = [...profile.experiences];
                next[i] = { ...exp, org: e.target.value };
                set({ experiences: next });
              }}
            />
            <input
              className={`${input} col-span-2`}
              placeholder="Dates (e.g. May 2025 - Jul 2025)"
              value={exp.dates ?? ""}
              onChange={(e) => {
                const next = [...profile.experiences];
                next[i] = { ...exp, dates: e.target.value };
                set({ experiences: next });
              }}
            />
            <textarea
              className={`${input} col-span-2`}
              placeholder="One bullet per line"
              rows={3}
              value={exp.bullets.join("\n")}
              onChange={(e) => {
                const next = [...profile.experiences];
                next[i] = { ...exp, bullets: e.target.value.split("\n").filter(Boolean) };
                set({ experiences: next });
              }}
            />
          </div>
        )}
      />

      {/* Projects */}
      <ListSection
        title="4. Projects"
        items={profile.projects}
        onAdd={() =>
          set({
            projects: [...profile.projects, { name: "", stack: [], summary: "" }],
          })
        }
        onRemove={(i) =>
          set({ projects: profile.projects.filter((_, x) => x !== i) })
        }
        render={(pr, i) => (
          <div className="grid grid-cols-2 gap-2">
            <input
              className={input}
              placeholder="Project name"
              value={pr.name}
              onChange={(e) => {
                const next = [...profile.projects];
                next[i] = { ...pr, name: e.target.value };
                set({ projects: next });
              }}
            />
            <input
              className={input}
              placeholder="Stack (comma separated)"
              value={pr.stack.join(", ")}
              onChange={(e) => {
                const next = [...profile.projects];
                next[i] = {
                  ...pr,
                  stack: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                };
                set({ projects: next });
              }}
            />
            <textarea
              className={`${input} col-span-2`}
              placeholder="One-line summary"
              rows={2}
              value={pr.summary ?? ""}
              onChange={(e) => {
                const next = [...profile.projects];
                next[i] = { ...pr, summary: e.target.value };
                set({ projects: next });
              }}
            />
          </div>
        )}
      />

      {/* Skills */}
      <section className={card}>
        <h2 className="mb-2 font-semibold">5. Skills</h2>
        <textarea
          className={input}
          rows={2}
          placeholder="Comma separated (e.g. TypeScript, React, User Research)"
          value={profile.skills.map((s) => s.name).join(", ")}
          onChange={(e) =>
            set({
              skills: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((name) => ({ name })),
            })
          }
        />
      </section>

      {/* Certifications */}
      <ListSection
        title="6. Certifications"
        items={profile.certifications}
        onAdd={() =>
          set({
            certifications: [
              ...profile.certifications,
              { name: "", issuer: "", date: "" },
            ],
          })
        }
        onRemove={(i) =>
          set({ certifications: profile.certifications.filter((_, x) => x !== i) })
        }
        render={(c, i) => (
          <div className="grid grid-cols-3 gap-2">
            <input
              className={input}
              placeholder="Name"
              value={c.name}
              onChange={(e) => {
                const next = [...profile.certifications];
                next[i] = { ...c, name: e.target.value };
                set({ certifications: next });
              }}
            />
            <input
              className={input}
              placeholder="Issuer"
              value={c.issuer ?? ""}
              onChange={(e) => {
                const next = [...profile.certifications];
                next[i] = { ...c, issuer: e.target.value };
                set({ certifications: next });
              }}
            />
            <input
              className={input}
              placeholder="Year"
              value={c.date ?? ""}
              onChange={(e) => {
                const next = [...profile.certifications];
                next[i] = { ...c, date: e.target.value };
                set({ certifications: next });
              }}
            />
          </div>
        )}
      />

      {/* Voice */}
      <VoiceSection token={token} hasVoice={hasVoice} onSaved={onVoiceSaved} />

      {/* Full resume */}
      <FullResume profile={profile} />

      {/* Save */}
      <div className="sticky bottom-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-black px-5 py-2.5 font-medium text-white shadow disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
      </div>
    </div>
  );
}

// A general (non-JD) resume from the whole profile: everything, in profile order.
function FullResume({ profile }: { profile: ProfileContext }) {
  const [show, setShow] = useState(false);
  const full: TailoredResume = {
    orderedProjectNames: profile.projects.map((p) => p.name),
    orderedExperienceTitles: profile.experiences.map((e) => `${e.title} @ ${e.org}`),
    includedSkillNames: profile.skills.map((s) => s.name),
  };
  return (
    <section className={card}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Your full resume</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShow((s) => !s)}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
          >
            {show ? "Hide" : "Preview"}
          </button>
          {show && (
            <button
              onClick={() => window.print()}
              className="rounded bg-black px-3 py-1.5 text-sm text-white dark:bg-white dark:text-black"
            >
              Download / Print to PDF
            </button>
          )}
        </div>
      </div>
      <p className="mb-3 text-xs text-neutral-400">
        A general resume from your whole profile. Save first to include your latest edits.
      </p>
      {show && <ResumePreview profile={profile} resume={full} />}
    </section>
  );
}

function ListSection<T>({
  title,
  items,
  onAdd,
  onRemove,
  render,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  render: (item: T, i: number) => React.ReactNode;
}) {
  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <button onClick={onAdd} className="text-sm text-blue-600 hover:underline">
          + Add
        </button>
      </div>
      <div className="space-y-4">
        {items.length === 0 && (
          <p className="text-sm text-neutral-400">Nothing yet.</p>
        )}
        {items.map((item, i) => (
          <div key={i} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
            {render(item, i)}
            <button
              onClick={() => onRemove(i)}
              className="mt-2 text-xs text-red-500 hover:underline"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function VoiceSection({
  token,
  hasVoice,
  onSaved,
}: {
  token: string;
  hasVoice: boolean;
  onSaved: () => void;
}) {
  const [samples, setSamples] = useState("");
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState(hasVoice ? "Voice saved ✓" : "");

  function save() {
    start(async () => {
      setMsg("");
      const res = await extractVoiceAction(
        token,
        samples.split("\n---\n").map((s) => s.trim()).filter(Boolean),
      );
      if (res.ok) {
        setMsg("Voice saved ✓");
        onSaved();
      } else setMsg(res.note ?? "Failed.");
    });
  }

  return (
    <section className={card}>
      <h2 className="mb-2 font-semibold">7. Voice (optional)</h2>
      <p className="mb-2 text-sm text-neutral-400">
        Paste 2&ndash;3 real messages you&apos;ve sent (separate them with a line of{" "}
        <code>---</code>). We learn your tone so emails sound like you.
      </p>
      <textarea
        className={input}
        rows={4}
        value={samples}
        onChange={(e) => setSamples(e.target.value)}
        placeholder={"Hey, saw your post about...\n---\nHi, quick question about..."}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded bg-neutral-800 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-200 dark:text-black"
        >
          {busy ? "Analysing…" : "Save voice"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </section>
  );
}
