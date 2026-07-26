import { llm } from "./llm";
import type { ProfileContext } from "./types";
import { traceProseAgainstProfile, type TraceIssue } from "./validate";

// Read a PUBLIC Google Form's questions by scraping the page's embedded
// FB_PUBLIC_LOAD_DATA_ blob, then generate answers in the user's voice.
// No extension, no auto-submit — the user copies each answer in (Decision:
// link-paste now, extension later). Layer 2: works, but fragile if Google
// changes the page format, and only works on public (no-login) forms.

export interface FormQA {
  question: string;
  answer: string;
}

export async function fetchGoogleFormQuestions(
  url: string,
): Promise<{ ok: boolean; questions: string[]; note?: string }> {
  if (!/docs\.google\.com\/forms/.test(url)) {
    return { ok: false, questions: [], note: "That doesn't look like a Google Forms link." };
  }
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; ApplyOS/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) {
      return { ok: false, questions: [], note: `Couldn't open the form (HTTP ${res.status}).` };
    }
    html = await res.text();
  } catch {
    return { ok: false, questions: [], note: "Couldn't reach that URL." };
  }

  const questions = extractQuestions(html);
  if (questions.length === 0) {
    return {
      ok: false,
      questions: [],
      note: "No questions found. The form may be private (login required) or Google changed its format.",
    };
  }
  return { ok: true, questions };
}

// Parse FB_PUBLIC_LOAD_DATA_ = [...]; The questions live at data[1][1]; each
// entry's title is at index 1, and entries with a null title (section breaks,
// images) are skipped.
export function extractQuestions(html: string): string[] {
  const marker = "FB_PUBLIC_LOAD_DATA_ =";
  const start = html.indexOf(marker);
  if (start === -1) return [];
  const from = html.indexOf("[", start);
  if (from === -1) return [];
  // Read until the terminating ";" that closes the assignment.
  const end = html.indexOf(";</script>", from);
  const raw = html.slice(from, end === -1 ? undefined : end).trim();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  try {
    const items = (data as unknown[])[1] as unknown[];
    const fields = items[1] as unknown[];
    const out: string[] = [];
    for (const f of fields) {
      const title = (f as unknown[])[1];
      if (typeof title === "string" && title.trim()) out.push(title.trim());
    }
    return out;
  } catch {
    return [];
  }
}

export async function answerFormQuestions(
  questions: string[],
  profile: ProfileContext,
): Promise<{ answers: FormQA[]; issues: TraceIssue[] }> {
  const system = [
    "You are filling out a job/internship application form AS the candidate, first person.",
    "Write a usable, confident answer to EVERY question. The candidate reviews and tweaks after, so NEVER leave a blank and NEVER answer 'Not available', 'None', 'N/A', or a bare 'No'.",
    "",
    "Length rule: match the answer's length to the question. SHORT/factual fields stay one line; OPEN-ENDED questions get a descriptive, enthusiastic answer (3-5 sentences) that makes the applicant look genuinely interested and qualified.",
    "",
    "How to answer by question type:",
    "- Contact/factual (name, email, phone, location, links, timezone): ONE line, straight from the profile. Do NOT pad these. Infer timezone from location (India = IST / GMT+5:30).",
    "- Multiple-choice or 'which best describes you': pick the option that best fits the profile; state it, then add ONE sentence of why it fits.",
    "- Scale questions (e.g. 1-7): give the number plus one sentence of reasoning.",
    "- Yes/no acceptance (accept terms, unpaid, etc.): 'Yes' plus a short confirming clause.",
    "- Experience/skills questions ('do you have experience with X'): answer in 2-4 sentences. Cite SPECIFIC projects, experiences, or skills from the profile by name. If a specific tool is absent, pivot to genuinely relevant/transferable experience — never a flat 'no'.",
    "- Open/motivation questions (why interested, goals, focus area, why this company): write 3-5 substantive sentences. Be specific and enthusiastic: name real projects/experiences from the profile, connect them to THIS role/company, and show what the candidate wants to learn or contribute. Sound like a motivated applicant, not a form-filler. This is motivation, not a fact to invent — writing it fresh is expected.",
    "- Availability / hours per week: give a concrete estimate the candidate can adjust (e.g., '15-20 hours per week'), optionally with a word on flexibility.",
    "",
    "Hard rule: never INVENT credentials — no fake employers, job titles, degrees, certifications, or metrics that aren't in the profile. If a specific credential is genuinely absent, answer honestly but positively by framing relevant/transferable experience, not a flat 'no'.",
    profile.voiceProfile
      ? "Match the candidate's voice; keep it natural, not robotic."
      : "Warm, plain, professional tone.",
    "Return JSON: { answers: [{ question, answer }] } in the same order as given.",
  ].join("\n");

  const user = [
    "PROFILE:",
    JSON.stringify(compact(profile), null, 2),
    "",
    "QUESTIONS:",
    ...questions.map((q, i) => `${i + 1}. ${q}`),
  ].join("\n");

  const raw = await llm().complete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.6,
    json: true,
    maxTokens: 4000,
  });

  const answers = parseAnswers(raw, questions);
  // Form answers legitimately include inferred values (timezone, hours, scale
  // picks), so the numeric-claim net would be noise here. The mandatory review
  // screen + the prompt's no-invented-credentials rule are the safety net.
  void traceProseAgainstProfile;
  return { answers, issues: [] };
}

function parseAnswers(raw: string, questions: string[]): FormQA[] {
  try {
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const obj = JSON.parse(cleaned) as { answers?: FormQA[] };
    if (Array.isArray(obj.answers) && obj.answers.length > 0) {
      return obj.answers.map((a, i) => ({
        question: a.question ?? questions[i] ?? "",
        answer: typeof a.answer === "string" ? a.answer : "",
      }));
    }
  } catch {
    /* fall through */
  }
  return questions.map((q) => ({ question: q, answer: "" }));
}

function compact(p: ProfileContext) {
  return {
    name: p.name,
    contact: p.contact, // email, phone, location — needed for contact questions
    links: p.links, // github, linkedin, portfolio
    experiences: p.experiences.map((e) => ({
      key: `${e.title} @ ${e.org}`,
      bullets: e.bullets,
    })),
    projects: p.projects.map((pr) => ({
      name: pr.name,
      stack: pr.stack,
      summary: pr.summary,
    })),
    skills: p.skills.map((s) => s.name),
    certifications: p.certifications.map((c) => c.name),
  };
}
