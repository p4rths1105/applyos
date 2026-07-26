"use client";

import type { ProfileContext, TailoredResume } from "@/lib/types";

// Renders the tailored resume from REAL profile content, ordered/filtered per
// the model's picks. The `.print-area` class is what the print stylesheet keeps
// visible when the user hits Download / Print to PDF.
export function ResumePreview({
  profile,
  resume,
}: {
  profile: ProfileContext;
  resume: TailoredResume;
}) {
  const projByName = new Map(profile.projects.map((p) => [p.name, p]));
  const expByKey = new Map(
    profile.experiences.map((e) => [`${e.title} @ ${e.org}`, e]),
  );

  const projects = resume.orderedProjectNames
    .map((n) => projByName.get(n))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const experiences = resume.orderedExperienceTitles
    .map((k) => expByKey.get(k))
    .filter((e): e is NonNullable<typeof e> => Boolean(e));
  const skills = resume.includedSkillNames;

  return (
    <div className="print-area rounded border border-neutral-200 bg-white p-8 text-black dark:border-neutral-800">
      <h1 className="text-2xl font-bold">{profile.name || "Your Name"}</h1>
      <p className="mt-1 text-sm text-neutral-600">
        {[profile.contact.email, profile.contact.location, profile.links.github]
          .filter(Boolean)
          .join("  ·  ")}
      </p>

      {resume.summary && <p className="mt-4 text-sm">{resume.summary}</p>}

      {experiences.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Experience
          </h2>
          {experiences.map((e, i) => (
            <div key={i} className="mt-3">
              <div className="flex justify-between text-sm font-semibold">
                <span>
                  {e.title} · {e.org}
                </span>
                {e.dates && <span className="font-normal text-neutral-500">{e.dates}</span>}
              </div>
              <ul className="mt-1 list-disc pl-5 text-sm">
                {e.bullets.map((b, n) => (
                  <li key={n}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {projects.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Projects
          </h2>
          {projects.map((p, i) => (
            <div key={i} className="mt-3 text-sm">
              <div className="font-semibold">
                {p.name}
                {p.stack.length > 0 && (
                  <span className="font-normal text-neutral-500">
                    {" "}
                    — {p.stack.join(", ")}
                  </span>
                )}
              </div>
              {p.summary && <p>{p.summary}</p>}
            </div>
          ))}
        </section>
      )}

      {skills.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Skills
          </h2>
          <p className="mt-2 text-sm">{skills.join("  ·  ")}</p>
        </section>
      )}

      {profile.certifications.length > 0 && (
        <section className="mt-6">
          <h2 className="border-b border-neutral-300 pb-1 text-sm font-bold uppercase tracking-wide">
            Certifications
          </h2>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {profile.certifications.map((c, i) => (
              <li key={i}>
                {c.name}
                {c.issuer && ` — ${c.issuer}`}
                {c.date && ` (${c.date})`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
