import { llm } from "./llm";
import type { ProfileContext } from "./types";

// Resume text -> structured profile (Decision 2). The user ALWAYS reviews and
// corrects the result; this is a first draft, not a source of truth. We do not
// invent — if a field isn't in the text, it's left empty.

export type ParsedProfile = Omit<ProfileContext, "voiceProfile">;

const EMPTY: ParsedProfile = {
  name: "",
  summary: "",
  contact: {},
  links: {},
  experiences: [],
  positions: [],
  education: [],
  projects: [],
  skills: [],
  certifications: [],
};

export async function parseResumeText(text: string): Promise<ParsedProfile> {
  if (!text.trim()) return EMPTY;

  const system = [
    "Extract a structured profile from the resume text below.",
    "Use ONLY what is present in the text. Do not infer, embellish, or invent.",
    "Leave a field empty if the text doesn't contain it.",
    "Return JSON with keys:",
    "name (string),",
    "summary (string — the professional summary / objective, if present),",
    "contact ({ email?, phone?, location? }),",
    "links ({ github?, linkedin?, portfolio? }),",
    "experiences (array of { title, org, dates?, location?, bullets: string[] }) — jobs/internships,",
    "positions (array of { title, org, dates?, location?, bullets: string[] }) — 'Position of Responsibility' / leadership / club roles, kept SEPARATE from experiences,",
    "education (array of { school, degree?, dates?, location? }),",
    "projects (array of { name, role?, date?, stack: string[], bullets: string[] }) — capture the FULL bullet descriptions verbatim, plus any role (e.g. 'Team Lead') and year,",
    "skills (array of { name, category }) — set category to a short group label like 'Product', 'Frameworks', 'Tools', 'Technical', or 'Languages'; always assign one so skills can be grouped,",
    "certifications (array of { name, issuer?, date? }).",
    "Preserve bullet wording verbatim. If a section is absent, use an empty array.",
  ].join("\n");

  const raw = await llm().complete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: `RESUME TEXT:\n${text.slice(0, 12000)}` },
    ],
    temperature: 0.1,
    json: true,
    maxTokens: 3000,
  });

  return coerce(raw);
}

function coerce(raw: string): ParsedProfile {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const p = JSON.parse(cleaned) as Partial<ParsedProfile>;
    const mapExp = (e: Partial<ParsedProfile["experiences"][number]> | undefined) => ({
      title: str(e?.title),
      org: str(e?.org),
      dates: e?.dates ? str(e.dates) : undefined,
      location: e?.location ? str(e.location) : undefined,
      bullets: Array.isArray(e?.bullets) ? e!.bullets!.map(str) : [],
    });
    return {
      name: str(p.name),
      summary: p.summary ? str(p.summary) : "",
      contact: p.contact ?? {},
      links: p.links ?? {},
      experiences: Array.isArray(p.experiences) ? p.experiences.map(mapExp) : [],
      positions: Array.isArray(p.positions) ? p.positions.map(mapExp) : [],
      education: Array.isArray(p.education)
        ? p.education.map((e) => ({
            school: str(e?.school),
            degree: e?.degree ? str(e.degree) : undefined,
            dates: e?.dates ? str(e.dates) : undefined,
            location: e?.location ? str(e.location) : undefined,
          }))
        : [],
      projects: Array.isArray(p.projects)
        ? p.projects.map((pr) => ({
            name: str(pr?.name),
            role: pr?.role ? str(pr.role) : undefined,
            date: pr?.date ? str(pr.date) : undefined,
            stack: Array.isArray(pr?.stack) ? pr.stack.map(str) : [],
            summary: pr?.summary ? str(pr.summary) : undefined,
            bullets: Array.isArray(pr?.bullets) ? pr.bullets.map(str) : [],
          }))
        : [],
      skills: Array.isArray(p.skills)
        ? p.skills.map((s) => ({
            name: str(s?.name),
            category: s?.category ? str(s.category) : undefined,
          }))
        : [],
      certifications: Array.isArray(p.certifications)
        ? p.certifications.map((c) => ({
            name: str(c?.name),
            issuer: c?.issuer ? str(c.issuer) : undefined,
            date: c?.date ? str(c.date) : undefined,
          }))
        : [],
    };
  } catch {
    return EMPTY;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
