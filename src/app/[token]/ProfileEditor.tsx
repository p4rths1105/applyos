"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ProfileContext, ExperienceItem } from "@/lib/types";
import {
  importResumeAction,
  saveProfileAction,
  extractVoiceAction,
} from "../actions";

type Editable = Omit<ProfileContext, "voiceProfile">;

const input =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700";
const label = "block text-xs font-medium text-neutral-500 mb-1";
const card =
  "rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900";

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
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [parsing, startParse] = useTransition();
  const [savedMsg, setSavedMsg] = useState("");
  const [parseNote, setParseNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Editable>) => onChange({ ...profile, ...patch });

  function uploadResume(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("resume", f);
    startParse(async () => {
      setParseNote("");
      const res = await importResumeAction(token, fd);
      if (!res.ok) setParseNote(res.note ?? "Couldn't read that PDF.");
      else {
        setParseNote("Imported. Review below and Save any edits.");
        router.refresh();
      }
    });
  }

  function save() {
    startSave(async () => {
      setSavedMsg("");
      const { voiceProfile, ...editable } = profile;
      void voiceProfile;
      await saveProfileAction(token, editable);
      setSavedMsg("Saved ✓");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-neutral-500">
            Your single source of truth. Everything is generated from this.
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            name="resume"
            accept="application/pdf"
            className="hidden"
            onChange={uploadResume}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={parsing}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-neutral-700"
          >
            {parsing ? "Reading…" : "Import from PDF"}
          </button>
        </div>
      </div>
      {parseNote && <p className="text-sm text-amber-600">{parseNote}</p>}

      {/* Basics */}
      <section className={card}>
        <h2 className="mb-3 font-semibold">Basics</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={label}>Name</label>
            <input className={input} value={profile.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className={label}>Professional summary</label>
            <textarea
              className={input}
              rows={2}
              value={profile.summary ?? ""}
              onChange={(e) => set({ summary: e.target.value })}
              placeholder="One or two lines on who you are and what you do."
            />
          </div>
          <div>
            <label className={label}>Email</label>
            <input className={input} value={profile.contact.email ?? ""} onChange={(e) => set({ contact: { ...profile.contact, email: e.target.value } })} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input className={input} value={profile.contact.phone ?? ""} onChange={(e) => set({ contact: { ...profile.contact, phone: e.target.value } })} />
          </div>
          <div>
            <label className={label}>Location</label>
            <input className={input} value={profile.contact.location ?? ""} onChange={(e) => set({ contact: { ...profile.contact, location: e.target.value } })} />
          </div>
          <div>
            <label className={label}>GitHub</label>
            <input className={input} value={profile.links.github ?? ""} onChange={(e) => set({ links: { ...profile.links, github: e.target.value } })} />
          </div>
          <div>
            <label className={label}>LinkedIn</label>
            <input className={input} value={profile.links.linkedin ?? ""} onChange={(e) => set({ links: { ...profile.links, linkedin: e.target.value } })} />
          </div>
          <div>
            <label className={label}>Portfolio</label>
            <input className={input} value={profile.links.portfolio ?? ""} onChange={(e) => set({ links: { ...profile.links, portfolio: e.target.value } })} />
          </div>
        </div>
      </section>

      {/* Education */}
      <ListSection
        title="Education"
        items={profile.education}
        onAdd={() => set({ education: [...profile.education, { school: "", degree: "", dates: "", location: "" }] })}
        onRemove={(i) => set({ education: profile.education.filter((_, x) => x !== i) })}
        render={(ed, i) => (
          <div className="grid grid-cols-2 gap-2">
            <input className={input} placeholder="School" value={ed.school} onChange={(e) => { const n = [...profile.education]; n[i] = { ...ed, school: e.target.value }; set({ education: n }); }} />
            <input className={input} placeholder="Degree" value={ed.degree ?? ""} onChange={(e) => { const n = [...profile.education]; n[i] = { ...ed, degree: e.target.value }; set({ education: n }); }} />
            <input className={input} placeholder="Dates" value={ed.dates ?? ""} onChange={(e) => { const n = [...profile.education]; n[i] = { ...ed, dates: e.target.value }; set({ education: n }); }} />
            <input className={input} placeholder="Location" value={ed.location ?? ""} onChange={(e) => { const n = [...profile.education]; n[i] = { ...ed, location: e.target.value }; set({ education: n }); }} />
          </div>
        )}
      />

      {/* Experience */}
      <ExpSection
        title="Experience"
        items={profile.experiences}
        input={input}
        onAdd={() => set({ experiences: [...profile.experiences, { title: "", org: "", dates: "", location: "", bullets: [] }] })}
        onRemove={(i) => set({ experiences: profile.experiences.filter((_, x) => x !== i) })}
        onEdit={(i, patch) => { const n = [...profile.experiences]; n[i] = { ...n[i], ...patch }; set({ experiences: n }); }}
      />

      {/* Positions of Responsibility */}
      <ExpSection
        title="Position of Responsibility"
        items={profile.positions}
        input={input}
        onAdd={() => set({ positions: [...profile.positions, { title: "", org: "", dates: "", location: "", bullets: [] }] })}
        onRemove={(i) => set({ positions: profile.positions.filter((_, x) => x !== i) })}
        onEdit={(i, patch) => { const n = [...profile.positions]; n[i] = { ...n[i], ...patch }; set({ positions: n }); }}
      />

      {/* Projects */}
      <ListSection
        title="Projects"
        items={profile.projects}
        onAdd={() => set({ projects: [...profile.projects, { name: "", role: "", date: "", stack: [], summary: "", bullets: [] }] })}
        onRemove={(i) => set({ projects: profile.projects.filter((_, x) => x !== i) })}
        render={(pr, i) => (
          <div className="grid grid-cols-3 gap-2">
            <input className={`${input} col-span-3`} placeholder="Project name" value={pr.name} onChange={(e) => { const n = [...profile.projects]; n[i] = { ...pr, name: e.target.value }; set({ projects: n }); }} />
            <input className={input} placeholder="Role (e.g. Team Lead)" value={pr.role ?? ""} onChange={(e) => { const n = [...profile.projects]; n[i] = { ...pr, role: e.target.value }; set({ projects: n }); }} />
            <input className={input} placeholder="Year" value={pr.date ?? ""} onChange={(e) => { const n = [...profile.projects]; n[i] = { ...pr, date: e.target.value }; set({ projects: n }); }} />
            <input className={input} placeholder="Stack (comma sep)" value={pr.stack.join(", ")} onChange={(e) => { const n = [...profile.projects]; n[i] = { ...pr, stack: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }; set({ projects: n }); }} />
            <textarea className={`${input} col-span-3`} rows={3} placeholder="One bullet per line" value={pr.bullets.join("\n")} onChange={(e) => { const n = [...profile.projects]; n[i] = { ...pr, bullets: e.target.value.split("\n").filter(Boolean) }; set({ projects: n }); }} />
          </div>
        )}
      />

      {/* Skills */}
      <section className={card}>
        <h2 className="mb-2 font-semibold">Skills</h2>
        <textarea
          className={input}
          rows={2}
          placeholder="Comma separated (e.g. Product Strategy, Figma, SQL)"
          value={profile.skills.map((s) => s.name).join(", ")}
          onChange={(e) => set({ skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean).map((name) => ({ name })) })}
        />
      </section>

      {/* Certifications */}
      <ListSection
        title="Certifications"
        items={profile.certifications}
        onAdd={() => set({ certifications: [...profile.certifications, { name: "", issuer: "", date: "" }] })}
        onRemove={(i) => set({ certifications: profile.certifications.filter((_, x) => x !== i) })}
        render={(c, i) => (
          <div className="grid grid-cols-3 gap-2">
            <input className={input} placeholder="Name" value={c.name} onChange={(e) => { const n = [...profile.certifications]; n[i] = { ...c, name: e.target.value }; set({ certifications: n }); }} />
            <input className={input} placeholder="Issuer" value={c.issuer ?? ""} onChange={(e) => { const n = [...profile.certifications]; n[i] = { ...c, issuer: e.target.value }; set({ certifications: n }); }} />
            <input className={input} placeholder="Year" value={c.date ?? ""} onChange={(e) => { const n = [...profile.certifications]; n[i] = { ...c, date: e.target.value }; set({ certifications: n }); }} />
          </div>
        )}
      />

      {/* Voice */}
      <VoiceSection token={token} hasVoice={hasVoice} onSaved={onVoiceSaved} input={input} card={card} />

      {/* Save */}
      <div className="sticky bottom-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-black px-6 py-2.5 font-medium text-white shadow-lg disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {savedMsg && <span className="text-sm text-green-600">{savedMsg}</span>}
      </div>
    </div>
  );
}

function ExpSection({
  title,
  items,
  input,
  onAdd,
  onRemove,
  onEdit,
}: {
  title: string;
  items: ExperienceItem[];
  input: string;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onEdit: (i: number, patch: Partial<ExperienceItem>) => void;
}) {
  return (
    <ListSection
      title={title}
      items={items}
      onAdd={onAdd}
      onRemove={onRemove}
      render={(e, i) => (
        <div className="grid grid-cols-2 gap-2">
          <input className={input} placeholder="Role / title" value={e.title} onChange={(ev) => onEdit(i, { title: ev.target.value })} />
          <input className={input} placeholder="Organisation" value={e.org} onChange={(ev) => onEdit(i, { org: ev.target.value })} />
          <input className={input} placeholder="Dates" value={e.dates ?? ""} onChange={(ev) => onEdit(i, { dates: ev.target.value })} />
          <input className={input} placeholder="Location" value={e.location ?? ""} onChange={(ev) => onEdit(i, { location: ev.target.value })} />
          <textarea className={`${input} col-span-2`} rows={3} placeholder="One bullet per line" value={e.bullets.join("\n")} onChange={(ev) => onEdit(i, { bullets: ev.target.value.split("\n").filter(Boolean) })} />
        </div>
      )}
    />
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
        <button onClick={onAdd} className="text-sm font-medium text-blue-600 hover:underline">
          + Add
        </button>
      </div>
      <div className="space-y-3">
        {items.length === 0 && <p className="text-sm text-neutral-400">Nothing yet.</p>}
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
            {render(item, i)}
            <button onClick={() => onRemove(i)} className="mt-2 text-xs text-red-500 hover:underline">
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
  input,
  card,
}: {
  token: string;
  hasVoice: boolean;
  onSaved: () => void;
  input: string;
  card: string;
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
      <h2 className="mb-2 font-semibold">Voice (optional)</h2>
      <p className="mb-2 text-sm text-neutral-400">
        Paste 2&ndash;3 real messages you&apos;ve sent (separate with a line of{" "}
        <code>---</code>). Emails and DMs will sound like you.
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
          className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm text-white disabled:opacity-50 dark:bg-neutral-200 dark:text-black"
        >
          {busy ? "Analysing…" : "Save voice"}
        </button>
        {msg && <span className="text-sm text-green-600">{msg}</span>}
      </div>
    </section>
  );
}
