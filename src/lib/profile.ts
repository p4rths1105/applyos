import { prisma } from "./db";
import { Prisma } from "@/generated/prisma/client";
import { llm } from "./llm";
import type { ProfileContext, VoiceProfile } from "./types";

const asJson = (v: unknown) => v as unknown as Prisma.InputJsonValue;

// Load a full profile (with relations) as the domain ProfileContext used by the
// generation service. Returns null if the token doesn't exist.
export async function loadProfileContext(
  token: string,
): Promise<ProfileContext | null> {
  const p = await prisma.profile.findUnique({
    where: { token },
    include: {
      experiences: { orderBy: { order: "asc" } },
      education: { orderBy: { order: "asc" } },
      projects: true,
      skills: true,
      certifications: true,
    },
  });
  if (!p) return null;

  const mapExp = (e: (typeof p.experiences)[number]) => ({
    title: e.title,
    org: e.org,
    dates: e.dates ?? undefined,
    location: e.location ?? undefined,
    bullets: e.bullets,
  });

  return {
    name: p.name ?? "",
    summary: p.summary ?? undefined,
    contact: (p.contact as ProfileContext["contact"]) ?? {},
    links: (p.links as ProfileContext["links"]) ?? {},
    experiences: p.experiences.filter((e) => e.kind !== "position").map(mapExp),
    positions: p.experiences.filter((e) => e.kind === "position").map(mapExp),
    education: p.education.map((e) => ({
      school: e.school,
      degree: e.degree ?? undefined,
      dates: e.dates ?? undefined,
      location: e.location ?? undefined,
    })),
    projects: p.projects.map((pr) => ({
      name: pr.name,
      role: pr.role ?? undefined,
      date: pr.date ?? undefined,
      stack: pr.stack,
      summary: pr.summary ?? undefined,
      bullets: pr.bullets,
      links: (pr.links as { repo?: string; demo?: string } | null) ?? undefined,
    })),
    skills: p.skills.map((s) => ({
      name: s.name,
      category: s.category ?? undefined,
    })),
    certifications: p.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer ?? undefined,
      date: c.date ?? undefined,
    })),
    voiceProfile: (p.voiceProfile as VoiceProfile | null) ?? null,
  };
}

// Replace the whole profile content in one transaction. Simplest correct model
// for MVP: the editor sends the full desired state, we mirror it.
export async function saveProfileContext(
  token: string,
  data: Omit<ProfileContext, "voiceProfile"> & { voiceProfile?: VoiceProfile | null },
): Promise<void> {
  const p = await prisma.profile.findUnique({ where: { token } });
  if (!p) throw new Error("profile not found");

  const expCreate = [
    ...data.experiences.map((e, i) => ({
      title: e.title,
      org: e.org,
      dates: e.dates,
      location: e.location,
      kind: "experience",
      order: i,
      bullets: e.bullets,
    })),
    ...data.positions.map((e, i) => ({
      title: e.title,
      org: e.org,
      dates: e.dates,
      location: e.location,
      kind: "position",
      order: i,
      bullets: e.bullets,
    })),
  ];

  await prisma.$transaction([
    prisma.experience.deleteMany({ where: { profileId: p.id } }),
    prisma.education.deleteMany({ where: { profileId: p.id } }),
    prisma.project.deleteMany({ where: { profileId: p.id } }),
    prisma.skill.deleteMany({ where: { profileId: p.id } }),
    prisma.certification.deleteMany({ where: { profileId: p.id } }),
    prisma.profile.update({
      where: { id: p.id },
      data: {
        name: data.name,
        summary: data.summary,
        contact: asJson(data.contact),
        links: asJson(data.links),
        ...(data.voiceProfile !== undefined
          ? { voiceProfile: asJson(data.voiceProfile) }
          : {}),
        experiences: { create: expCreate },
        education: {
          create: data.education.map((e, i) => ({
            school: e.school,
            degree: e.degree,
            dates: e.dates,
            location: e.location,
            order: i,
          })),
        },
        projects: {
          create: data.projects.map((pr, i) => ({
            name: pr.name,
            role: pr.role,
            date: pr.date,
            stack: pr.stack,
            summary: pr.summary,
            bullets: pr.bullets ?? [],
            links: pr.links ?? undefined,
            order: i,
          })),
        },
        skills: {
          create: data.skills.map((s) => ({
            name: s.name,
            category: s.category,
          })),
        },
        certifications: {
          create: data.certifications.map((c) => ({
            name: c.name,
            issuer: c.issuer,
            date: c.date,
          })),
        },
      },
    }),
  ]);
}

// Voice fingerprint from pasted sample messages (upside, not the gate).
export async function extractVoiceProfile(
  samples: string[],
): Promise<VoiceProfile | null> {
  const joined = samples.map((s) => s.trim()).filter(Boolean).join("\n---\n");
  if (!joined) return null;

  const system = [
    "Analyse the writing samples and describe the author's voice as JSON with keys:",
    "sentenceLength, formality, vocabulary, openings, closings, notes.",
    "Each value is a short phrase. Base it ONLY on the samples.",
  ].join("\n");

  const raw = await llm().complete({
    messages: [
      { role: "system", content: system },
      { role: "user", content: `SAMPLES:\n${joined.slice(0, 8000)}` },
    ],
    temperature: 0.2,
    json: true,
  });

  try {
    const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const v = JSON.parse(cleaned) as VoiceProfile;
    return {
      sentenceLength: v.sentenceLength ?? "",
      formality: v.formality ?? "",
      vocabulary: v.vocabulary ?? "",
      openings: v.openings ?? "",
      closings: v.closings ?? "",
      notes: v.notes,
    };
  } catch {
    return null;
  }
}
