// Plain domain shapes used to assemble generation context. These mirror the
// Prisma models but are decoupled so the generation service never imports the DB.

export interface ExperienceItem {
  title: string;
  org: string;
  dates?: string;
  location?: string;
  bullets: string[];
}

export interface EducationItem {
  school: string;
  degree?: string;
  dates?: string;
  location?: string;
}

export interface ProfileContext {
  name: string;
  summary?: string;
  contact: { email?: string; phone?: string; location?: string };
  links: { github?: string; linkedin?: string; portfolio?: string };
  experiences: ExperienceItem[];
  // Position of Responsibility — same shape as experience, separate resume section.
  positions: ExperienceItem[];
  education: EducationItem[];
  projects: {
    name: string;
    stack: string[];
    summary?: string;
    links?: { repo?: string; demo?: string };
  }[];
  skills: { name: string; category?: string }[];
  certifications: { name: string; issuer?: string; date?: string }[];
  // Extracted voice fingerprint, or null when the user hasn't provided samples.
  voiceProfile: VoiceProfile | null;
}

export interface VoiceProfile {
  sentenceLength: string;
  formality: string;
  vocabulary: string;
  openings: string;
  closings: string;
  notes?: string;
}

export type OutputType = "resume" | "email" | "dm";

// A tailored resume: existing projects/experiences REORDERED and FILTERED for
// the JD. No rewording of bullet text (reorder + filter only — Decision 7).
export interface TailoredResume {
  summary?: string; // optional 1-2 line positioning, drawn only from profile facts
  orderedProjectNames: string[]; // subset + order of profile project names
  orderedExperienceTitles: string[]; // subset + order of "title @ org" keys
  includedSkillNames: string[]; // subset of profile skill names
}
