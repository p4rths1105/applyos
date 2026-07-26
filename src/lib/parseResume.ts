import { llm } from "./llm";
import type { ProfileContext } from "./types";

// Resume text -> structured profile (Decision 2). The user ALWAYS reviews and
// corrects the result; this is a first draft, not a source of truth. We do not
// invent — if a field isn't in the text, it's left empty.

export type ParsedProfile = Omit<ProfileContext, "voiceProfile">;

const EMPTY: ParsedProfile = {
  name: "",
  contact: {},
  links: {},
  experiences: [],
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
    "contact ({ email?, phone?, location? }),",
    "links ({ github?, linkedin?, portfolio? }),",
    "experiences (array of { title, org, dates?, bullets: string[] }),",
    "projects (array of { name, stack: string[], summary? }),",
    "skills (array of { name, category? }),",
    "certifications (array of { name, issuer?, date? }).",
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
    return {
      name: str(p.name),
      contact: p.contact ?? {},
      links: p.links ?? {},
      experiences: Array.isArray(p.experiences)
        ? p.experiences.map((e) => ({
            title: str(e?.title),
            org: str(e?.org),
            dates: e?.dates ? str(e.dates) : undefined,
            bullets: Array.isArray(e?.bullets) ? e.bullets.map(str) : [],
          }))
        : [],
      projects: Array.isArray(p.projects)
        ? p.projects.map((pr) => ({
            name: str(pr?.name),
            stack: Array.isArray(pr?.stack) ? pr.stack.map(str) : [],
            summary: pr?.summary ? str(pr.summary) : undefined,
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
