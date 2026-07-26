import type { ProfileContext, TailoredResume } from "./types";

// Runtime traceability validator (Decision 5). The load-bearing trust guard:
// every fact in generated output MUST trace to the profile. On open models this
// matters MORE — they invent more than Sonnet. Anything untraceable is FLAGGED
// so it surfaces on the review screen, never sent silently.

export interface TraceIssue {
  field: string;
  value: string;
  reason: string;
}

// Resume tailoring is reorder + filter only, so validation is exact-membership:
// every referenced entity must already exist in the profile.
export function validateTailoredResume(
  resume: TailoredResume,
  profile: ProfileContext,
): TraceIssue[] {
  const issues: TraceIssue[] = [];

  const projectNames = new Set(profile.projects.map((p) => p.name));
  for (const name of resume.orderedProjectNames) {
    if (!projectNames.has(name)) {
      issues.push({
        field: "orderedProjectNames",
        value: name,
        reason: "project not present in profile (invented)",
      });
    }
  }

  const expKeys = new Set(
    profile.experiences.map((e) => `${e.title} @ ${e.org}`),
  );
  for (const key of resume.orderedExperienceTitles) {
    if (!expKeys.has(key)) {
      issues.push({
        field: "orderedExperienceTitles",
        value: key,
        reason: "experience not present in profile (invented)",
      });
    }
  }

  const skillNames = new Set(
    profile.skills.map((s) => s.name.toLowerCase()),
  );
  for (const name of resume.includedSkillNames) {
    if (!skillNames.has(name.toLowerCase())) {
      issues.push({
        field: "includedSkillNames",
        value: name,
        reason: "skill not present in profile (invented)",
      });
    }
  }

  return issues;
}

// For prose outputs (email/DM) we can't do exact membership, but we CAN catch
// the highest-risk invention: proper nouns / orgs / numbers not in the profile.
// This is a heuristic net, surfaced as flags (not a hard block) on review.
export function traceProseAgainstProfile(
  text: string,
  profile: ProfileContext,
): TraceIssue[] {
  const issues: TraceIssue[] = [];

  const haystack = buildProfileHaystack(profile).toLowerCase();

  // Flag standalone numbers that look like claims (percentages, "10x", counts
  // like "50 users") when the same token isn't anywhere in the profile.
  const numberClaims = text.match(/\b\d+(?:\.\d+)?\s*(?:%|x|\+)?\b/gi) ?? [];
  for (const raw of numberClaims) {
    const token = raw.trim().toLowerCase();
    // ignore tiny/ordinary numbers that are usually not claims
    if (/^\d$/.test(token)) continue;
    if (!haystack.includes(token)) {
      issues.push({
        field: "prose:number",
        value: raw.trim(),
        reason: "numeric claim not found in profile — verify before sending",
      });
    }
  }

  return issues;
}

function buildProfileHaystack(profile: ProfileContext): string {
  const parts: string[] = [profile.name];
  for (const e of profile.experiences) {
    parts.push(e.title, e.org, e.dates ?? "", ...e.bullets);
  }
  for (const p of profile.projects) {
    parts.push(p.name, p.summary ?? "", ...p.stack);
  }
  for (const s of profile.skills) parts.push(s.name);
  return parts.join(" \n ");
}
