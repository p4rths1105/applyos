"use server";

import { redirect } from "next/navigation";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { newUserToken } from "@/lib/token";
import { extractPdfText } from "@/lib/pdf";
import { parseResumeText, type ParsedProfile } from "@/lib/parseResume";
import {
  loadProfileContext,
  saveProfileContext,
  extractVoiceProfile,
} from "@/lib/profile";
import { generate, type GenerateResult } from "@/lib/generate";
import {
  fetchGoogleFormQuestions,
  answerFormQuestions,
  type FormQA,
} from "@/lib/googleForm";
import type { TraceIssue } from "@/lib/validate";
import type { ProfileContext, OutputType } from "@/lib/types";

// Create a fresh profile with an unguessable token, then jump to its page.
export async function createProfileAction(): Promise<void> {
  const token = newUserToken();
  await prisma.profile.create({ data: { token } });
  redirect(`/${token}`);
}

// Landing "Add your current resume": create a workspace, parse the uploaded
// resume into it, then jump straight into the workspace. No separate parse step.
export async function createFromResumeAction(formData: FormData): Promise<void> {
  const token = newUserToken();
  await prisma.profile.create({ data: { token } });

  const file = formData.get("resume");
  if (file instanceof File && file.size > 0 && file.size <= 6 * 1024 * 1024) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const text = await extractPdfText(buf);
      if (text) {
        const draft = await parseResumeText(text);
        await saveProfileContext(token, draft);
      }
    } catch {
      // Non-fatal: land in an empty workspace and let them fill it in.
    }
  }
  redirect(`/${token}`);
}

// Upload -> extract text -> structure. Returns a DRAFT for the user to review;
// does NOT save. Empty/garbled PDFs fall back to an empty draft (manual entry).
export async function parseResumeAction(
  _token: string,
  formData: FormData,
): Promise<{ ok: boolean; draft: ParsedProfile; note?: string }> {
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, draft: emptyDraft(), note: "No file received." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, draft: emptyDraft(), note: "File is larger than 5MB." };
  }
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buf);
    if (!text) {
      return {
        ok: false,
        draft: emptyDraft(),
        note: "Couldn't read text from that PDF (scanned image?). Fill in below.",
      };
    }
    const draft = await parseResumeText(text);
    return { ok: true, draft };
  } catch {
    return {
      ok: false,
      draft: emptyDraft(),
      note: "Couldn't read that PDF. Fill in the fields below instead.",
    };
  }
}

// Resume tab: upload a PDF, parse it, and SAVE it into this profile (replaces
// the profile with the parsed content). Used by "add" and "change resume".
export async function importResumeAction(
  token: string,
  formData: FormData,
): Promise<{ ok: boolean; note?: string }> {
  const file = formData.get("resume");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, note: "No file received." };
  if (file.size > 6 * 1024 * 1024)
    return { ok: false, note: "File is larger than 6MB." };
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const text = await extractPdfText(buf);
    if (!text)
      return { ok: false, note: "Couldn't read text from that PDF (scanned image?)." };
    const draft = await parseResumeText(text);
    await saveProfileContext(token, draft);
    return { ok: true };
  } catch {
    return { ok: false, note: "Couldn't read that PDF." };
  }
}

export async function saveProfileAction(
  token: string,
  data: Omit<ProfileContext, "voiceProfile">,
): Promise<{ ok: boolean }> {
  await saveProfileContext(token, data);
  return { ok: true };
}

export async function extractVoiceAction(
  token: string,
  samples: string[],
): Promise<{ ok: boolean; note?: string }> {
  const voice = await extractVoiceProfile(samples);
  if (!voice) return { ok: false, note: "Need at least one non-empty sample." };
  const p = await prisma.profile.findUnique({ where: { token } });
  if (!p) return { ok: false, note: "Profile not found." };
  await prisma.profile.update({
    where: { id: p.id },
    data: { voiceProfile: voice as unknown as Prisma.InputJsonValue },
  });
  return { ok: true };
}

// JD -> tailored output. Records an Application row (feedback-loop seed) and,
// for resumes, caches the tailored version by jdHash.
export async function generateAction(
  token: string,
  type: OutputType,
  jd: string,
): Promise<{ ok: boolean; result?: GenerateResult; note?: string }> {
  const profile = await loadProfileContext(token);
  if (!profile) return { ok: false, note: "Profile not found." };
  if (!jd.trim()) return { ok: false, note: "Paste a job description first." };

  const result = await generate({ type, profile, jd });

  const p = await prisma.profile.findUnique({ where: { token } });
  if (p) {
    await prisma.application.create({
      data: { profileId: p.id, jd: jd.slice(0, 8000), outputType: type },
    });
    if (type === "resume") {
      const jdHash = createHash("sha256").update(jd).digest("hex").slice(0, 32);
      await prisma.resumeVersion.upsert({
        where: { profileId_jdHash: { profileId: p.id, jdHash } },
        create: { profileId: p.id, jdHash, contentJson: result.output as object },
        update: { contentJson: result.output as object },
      });
    }
  }
  return { ok: true, result };
}

// Paste a public Google Form link -> read its questions -> generate answers in
// the user's voice for them to copy in. No extension, no auto-submit.
export async function googleFormAnswersAction(
  token: string,
  url: string,
): Promise<{ ok: boolean; answers?: FormQA[]; issues?: TraceIssue[]; note?: string }> {
  const profile = await loadProfileContext(token);
  if (!profile) return { ok: false, note: "Profile not found." };

  const q = await fetchGoogleFormQuestions(url.trim());
  if (!q.ok) return { ok: false, note: q.note };

  const { answers, issues } = await answerFormQuestions(q.questions, profile);

  const p = await prisma.profile.findUnique({ where: { token } });
  if (p) {
    await prisma.application.create({
      data: { profileId: p.id, jd: url.slice(0, 2000), outputType: "form" },
    });
  }
  return { ok: true, answers, issues };
}

function emptyDraft(): ParsedProfile {
  return {
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
}
