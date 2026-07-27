import type { ProfileContext } from "./types";

// Shared test/eval fixture: a realistic student profile.
export const sampleProfile: ProfileContext = {
  name: "Rishav Dewan",
  summary: "Product-minded builder focused on user problems and shipping.",
  contact: { email: "rishav@example.com", location: "Sonipat, IN" },
  links: { github: "https://github.com/rishav" },
  experiences: [
    {
      title: "Product Intern",
      org: "Arthakram",
      dates: "May 2025 - Jul 2025",
      location: "Sonipat, IN",
      bullets: [
        "Shipped an internal analytics dashboard used by the ops team",
        "Ran 12 user interviews to scope the onboarding flow",
      ],
    },
  ],
  positions: [],
  education: [
    { school: "Rishihood University", degree: "B.Tech CS & AI", dates: "2025-2029" },
  ],
  projects: [
    {
      name: "Contextualize",
      stack: ["TypeScript", "Chrome Extension", "Manifest V3"],
      summary: "A Chrome extension that summarises the current page in context",
    },
    {
      name: "GitDoc",
      stack: ["TypeScript", "VS Code API"],
      summary: "A VS Code extension that auto-documents changed files",
    },
  ],
  skills: [
    { name: "TypeScript", category: "tech" },
    { name: "React", category: "tech" },
    { name: "User Research", category: "product" },
  ],
  certifications: [
    { name: "Google Data Analytics", issuer: "Coursera", date: "2025" },
  ],
  voiceProfile: null,
};

export const sampleJD =
  "Software Engineering Intern. Looking for someone strong in TypeScript and React, " +
  "who can build browser tooling and cares about developer experience.";
