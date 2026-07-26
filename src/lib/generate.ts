import { llm, type LLMProvider } from "./llm";
import type { ProfileContext, OutputType, TailoredResume } from "./types";
import {
  validateTailoredResume,
  traceProseAgainstProfile,
  type TraceIssue,
} from "./validate";

// THE shared generation service (Decision 6). Resume, email, and DM all flow
// through here: assemble context (profile + voice + JD) -> LLM -> parse ->
// validate. Voice injection and the hallucination check live in ONE place.

export interface GenerateInput {
  type: OutputType;
  profile: ProfileContext;
  jd: string;
}

export interface GenerateResult<T = unknown> {
  type: OutputType;
  output: T;
  // Untraceable facts to surface on the review screen. Empty == clean.
  issues: TraceIssue[];
}

const NO_INVENT = [
  "HARD RULE: Use ONLY facts present in the PROFILE below.",
  "Never invent an employer, project, skill, date, degree, or metric.",
  "If the profile lacks something the JD wants, omit it — do not fabricate it.",
].join(" ");

// `provider` is injectable for tests/evals; defaults to the configured vendor.
export async function generate(
  input: GenerateInput,
  provider: LLMProvider = llm(),
): Promise<GenerateResult> {
  switch (input.type) {
    case "resume":
      return generateResume(input, provider);
    case "email":
    case "dm":
      return generateProse(input, provider);
  }
}

async function generateResume(
  input: GenerateInput,
  provider: LLMProvider,
): Promise<GenerateResult<TailoredResume>> {
  const { profile, jd } = input;

  const system = [
    "You tailor a resume by REORDERING and FILTERING existing profile content.",
    "You do NOT reword bullet text and you do NOT add keywords. Reorder + filter only.",
    NO_INVENT,
    "Return JSON with keys: summary (optional, <=2 lines, only profile facts),",
    "orderedProjectNames (subset of profile project names, most relevant first),",
    "orderedExperienceTitles (subset of 'Title @ Org' keys, most relevant first),",
    "includedSkillNames (subset of profile skill names relevant to the JD).",
  ].join("\n");

  const user = [
    "PROFILE:",
    JSON.stringify(profileForPrompt(profile), null, 2),
    "",
    "JOB DESCRIPTION:",
    jd,
  ].join("\n");

  const raw = await provider.complete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.2,
    json: true,
  });

  const parsed = safeJson<TailoredResume>(raw, {
    orderedProjectNames: [],
    orderedExperienceTitles: [],
    includedSkillNames: [],
  });

  // Guard: if the model filtered EVERYTHING out (common when the JD is a poor
  // match for the profile), fall back to the full profile rather than shipping
  // a blank resume. Better to show all real content than nothing.
  const emptyResult =
    parsed.orderedProjectNames.length === 0 &&
    parsed.orderedExperienceTitles.length === 0 &&
    parsed.includedSkillNames.length === 0;
  const hasContent =
    profile.projects.length > 0 ||
    profile.experiences.length > 0 ||
    profile.skills.length > 0;
  if (emptyResult && hasContent) {
    parsed.orderedProjectNames = profile.projects.map((p) => p.name);
    parsed.orderedExperienceTitles = profile.experiences.map(
      (e) => `${e.title} @ ${e.org}`,
    );
    parsed.includedSkillNames = profile.skills.map((s) => s.name);
  }

  const issues = validateTailoredResume(parsed, profile);
  return { type: "resume", output: parsed, issues };
}

async function generateProse(
  input: GenerateInput,
  provider: LLMProvider,
): Promise<GenerateResult<string>> {
  const { profile, jd, type } = input;
  const channel = type === "email" ? "cold email to a recruiter" : "LinkedIn DM";

  const lengthGuide =
    type === "email"
      ? [
          "Length: a real email, ~120-180 words, 2-3 short paragraphs.",
          "Structure: a specific hook (why THIS role/company), 1-2 concrete proof points naming real projects/experience from the profile, then a clear, low-friction ask (a quick chat / next step).",
          "Include a subject line as the first line, formatted exactly as 'Subject: ...'.",
        ]
      : [
          "Length: a LinkedIn DM, ~60-90 words, tight and punchy (DMs that are too long get ignored).",
          "One specific hook + one concrete proof point from the profile + a short friendly ask. No subject line.",
        ];

  const system = [
    `Write a personalised ${channel} in the sender's own voice.`,
    "Be specific and show genuine interest — name REAL projects, experiences, or skills from the profile and connect them to this role. Descriptive where it earns attention, never generic.",
    ...lengthGuide,
    NO_INVENT,
    profile.voiceProfile
      ? voiceInstruction(profile.voiceProfile)
      : "No voice sample provided — use a warm, plain, professional tone. Avoid AI cliches.",
    "No filler, no 'I am writing to express my interest', no hollow superlatives.",
  ].join("\n");

  const user = [
    "SENDER PROFILE:",
    JSON.stringify(profileForPrompt(profile), null, 2),
    "",
    "JOB / ROLE CONTEXT:",
    jd,
  ].join("\n");

  const text = await provider.complete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.6,
  });

  const issues = traceProseAgainstProfile(text, profile);
  return { type, output: text.trim(), issues };
}

function voiceInstruction(v: NonNullable<ProfileContext["voiceProfile"]>): string {
  return [
    "Match this voice fingerprint:",
    `- sentence length: ${v.sentenceLength}`,
    `- formality: ${v.formality}`,
    `- vocabulary: ${v.vocabulary}`,
    `- typical opening: ${v.openings}`,
    `- typical closing: ${v.closings}`,
    v.notes ? `- notes: ${v.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Trim the profile to what the model needs (keeps token use low on free tier).
function profileForPrompt(p: ProfileContext) {
  return {
    name: p.name,
    links: p.links,
    experiences: p.experiences.map((e) => ({
      key: `${e.title} @ ${e.org}`,
      dates: e.dates,
      bullets: e.bullets,
    })),
    projects: p.projects.map((pr) => ({
      name: pr.name,
      stack: pr.stack,
      summary: pr.summary,
    })),
    skills: p.skills.map((s) => s.name),
    certifications: p.certifications.map((c) =>
      [c.name, c.issuer].filter(Boolean).join(" — "),
    ),
  };
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    // Strip accidental code fences some models add despite json mode.
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    return { ...fallback, ...(JSON.parse(cleaned) as T) };
  } catch {
    return fallback;
  }
}
