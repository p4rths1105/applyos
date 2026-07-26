import { describe, it, expect } from "vitest";
import { generate } from "@/lib/generate";
import type { LLMProvider, CompletionOpts } from "@/lib/llm";
import { validateTailoredResume } from "@/lib/validate";
import { sampleProfile, sampleJD } from "@/lib/fixtures";
import type { TailoredResume } from "@/lib/types";

// A fake provider that returns whatever JSON/text we hand it — lets us assert
// the trust guard WITHOUT calling the real Groq API (free-tier friendly, fast).
function fakeProvider(response: string): LLMProvider {
  return {
    name: "fake",
    async complete(_opts: CompletionOpts) {
      return response;
    },
  };
}

describe("no-invent guard — the trust guarantee", () => {
  it("flags a resume that references a project not in the profile", async () => {
    const hallucinated: TailoredResume = {
      orderedProjectNames: ["Contextualize", "PayFlow (Stripe clone)"], // 2nd is invented
      orderedExperienceTitles: ["Product Intern @ Arthakram"],
      includedSkillNames: ["TypeScript", "React"],
    };
    const res = await generate(
      { type: "resume", profile: sampleProfile, jd: sampleJD },
      fakeProvider(JSON.stringify(hallucinated)),
    );
    expect(res.issues.length).toBeGreaterThan(0);
    expect(res.issues.some((i) => i.value.includes("PayFlow"))).toBe(true);
  });

  it("flags an invented skill and an invented employer", async () => {
    const hallucinated: TailoredResume = {
      orderedProjectNames: ["Contextualize"],
      orderedExperienceTitles: ["Senior Engineer @ Google"], // invented
      includedSkillNames: ["TypeScript", "Rust"], // Rust invented
    };
    const res = await generate(
      { type: "resume", profile: sampleProfile, jd: sampleJD },
      fakeProvider(JSON.stringify(hallucinated)),
    );
    const values = res.issues.map((i) => i.value);
    expect(values).toContain("Senior Engineer @ Google");
    expect(values).toContain("Rust");
  });

  it("passes a clean resume that only reorders/filters real profile content", async () => {
    const clean: TailoredResume = {
      orderedProjectNames: ["GitDoc", "Contextualize"], // reordered, both real
      orderedExperienceTitles: ["Product Intern @ Arthakram"],
      includedSkillNames: ["TypeScript", "React"], // filtered subset, both real
    };
    const res = await generate(
      { type: "resume", profile: sampleProfile, jd: sampleJD },
      fakeProvider(JSON.stringify(clean)),
    );
    expect(res.issues).toEqual([]);
  });

  it("flags a numeric claim in prose that isn't backed by the profile", async () => {
    const res = await generate(
      { type: "email", profile: sampleProfile, jd: sampleJD },
      fakeProvider("Hi, I boosted revenue by 250% at my last role. Let's talk."),
    );
    // 250% appears nowhere in the profile -> must be flagged for review.
    expect(res.issues.some((i) => i.value.includes("250"))).toBe(true);
  });
});

describe("empty-resume guard", () => {
  it("falls back to full profile when the model filters everything out", async () => {
    const empty: TailoredResume = {
      orderedProjectNames: [],
      orderedExperienceTitles: [],
      includedSkillNames: [],
    };
    const res = await generate(
      { type: "resume", profile: sampleProfile, jd: "unrelated JD" },
      fakeProvider(JSON.stringify(empty)),
    );
    const out = res.output as TailoredResume;
    expect(out.orderedProjectNames.length).toBeGreaterThan(0);
    expect(out.includedSkillNames.length).toBeGreaterThan(0);
    expect(res.issues).toEqual([]); // fallback content is all real -> no flags
  });
});

describe("validateTailoredResume — direct unit coverage", () => {
  it("returns no issues when everything traces to the profile", () => {
    expect(
      validateTailoredResume(
        {
          orderedProjectNames: ["Contextualize"],
          orderedExperienceTitles: ["Product Intern @ Arthakram"],
          includedSkillNames: ["React"],
        },
        sampleProfile,
      ),
    ).toEqual([]);
  });
});
