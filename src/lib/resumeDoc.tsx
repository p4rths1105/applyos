import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Link,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ProfileContext, TailoredResume, ExperienceItem } from "./types";

// A dense, professional one-page resume that mirrors a standard PM/student
// LaTeX-style resume: centered header, tight section rules, right-aligned
// dates/locations, bold orgs, italic titles, grouped skills, clickable links.
// Built-in Helvetica (no font files -> safe on serverless). Server-rendered to
// a real PDF: no browser print chrome, no accidental page overflow.

const INK = "#1a1a1a";
const MUTED = "#4a4a4a";

const s = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 24,
    paddingHorizontal: 42,
    fontFamily: "Helvetica",
    fontSize: 9.2,
    color: INK,
    lineHeight: 1.32,
  },
  name: { fontSize: 17, fontFamily: "Helvetica-Bold", textAlign: "center", letterSpacing: 0.3 },
  contact: { fontSize: 8.6, textAlign: "center", color: MUTED, marginTop: 3 },
  link: { color: "#1a4fd6", textDecoration: "none" },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    borderBottomWidth: 0.8,
    borderBottomColor: INK,
    paddingBottom: 1.5,
    marginTop: 9,
    marginBottom: 4,
  },
  summary: { fontSize: 9.2, color: INK, textAlign: "justify" },
  entry: { marginBottom: 4.5 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  org: { fontSize: 9.6, fontFamily: "Helvetica-Bold" },
  right: { fontSize: 8.6, color: MUTED },
  title: { fontSize: 9.2, fontFamily: "Helvetica-Oblique", color: MUTED },
  bullet: { flexDirection: "row", marginTop: 1.5, paddingRight: 2 },
  bulletDot: { width: 9, fontSize: 9.2 },
  bulletText: { flex: 1, fontSize: 9.2, textAlign: "justify" },
  skillRow: { flexDirection: "row", marginBottom: 1.5 },
  skillCat: { fontSize: 9.2, fontFamily: "Helvetica-Bold", width: 78 },
  skillVals: { flex: 1, fontSize: 9.2 },
});

function contactLine(p: ProfileContext) {
  const parts: React.ReactNode[] = [];
  const add = (node: React.ReactNode) => {
    if (parts.length) parts.push(<Text key={`s${parts.length}`}>{"  ·  "}</Text>);
    parts.push(node);
  };
  if (p.contact.phone) add(<Text key="ph">{p.contact.phone}</Text>);
  if (p.contact.email) add(<Text key="em">{p.contact.email}</Text>);
  if (p.contact.location) add(<Text key="lo">{p.contact.location}</Text>);
  if (p.links.linkedin) add(<Link key="li" src={p.links.linkedin} style={s.link}>LinkedIn</Link>);
  if (p.links.github) add(<Link key="gh" src={p.links.github} style={s.link}>GitHub</Link>);
  if (p.links.portfolio) add(<Link key="pf" src={p.links.portfolio} style={s.link}>Portfolio</Link>);
  return parts;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ExpEntry({ e }: { e: ExperienceItem }) {
  return (
    <View style={s.entry} wrap={false}>
      <View style={s.rowBetween}>
        <Text style={s.org}>{e.org}</Text>
        {e.dates ? <Text style={s.right}>{e.dates}</Text> : null}
      </View>
      {(e.title || e.location) && (
        <View style={s.rowBetween}>
          <Text style={s.title}>{e.title}</Text>
          {e.location ? <Text style={s.right}>{e.location}</Text> : null}
        </View>
      )}
      {e.bullets.map((b, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

// Group skills by category (Product / Frameworks / Tools ...) when categories
// exist; otherwise render one flat line.
function groupSkills(skills: { name: string; category?: string }[]) {
  const withCat = skills.filter((s) => s.category);
  if (withCat.length >= Math.max(2, skills.length * 0.5)) {
    const map = new Map<string, string[]>();
    for (const sk of skills) {
      const c = sk.category || "Other";
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(sk.name);
    }
    return [...map.entries()].map(([cat, names]) => ({ cat, names }));
  }
  return null;
}

function resolve(profile: ProfileContext, tailored: TailoredResume | null) {
  if (!tailored) {
    return {
      summary: profile.summary,
      experiences: profile.experiences,
      projects: profile.projects,
      skills: profile.skills,
    };
  }
  const expByKey = new Map(profile.experiences.map((e) => [`${e.title} @ ${e.org}`, e]));
  const projByName = new Map(profile.projects.map((p) => [p.name, p]));
  const experiences = tailored.orderedExperienceTitles
    .map((k) => expByKey.get(k))
    .filter((e): e is ExperienceItem => Boolean(e));
  const projects = tailored.orderedProjectNames
    .map((n) => projByName.get(n))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const skillSet = new Set(tailored.includedSkillNames.map((x) => x.toLowerCase()));
  const skills = tailored.includedSkillNames.length
    ? profile.skills.filter((sk) => skillSet.has(sk.name.toLowerCase()))
    : profile.skills;
  return {
    summary: tailored.summary || profile.summary,
    experiences: experiences.length ? experiences : profile.experiences,
    projects: projects.length ? projects : profile.projects,
    skills: skills.length ? skills : profile.skills,
  };
}

export function ResumeDocument({
  profile,
  tailored = null,
}: {
  profile: ProfileContext;
  tailored?: TailoredResume | null;
}) {
  const r = resolve(profile, tailored);
  const grouped = groupSkills(r.skills);

  return (
    <Document title={`${profile.name || "Resume"} — Resume`} author={profile.name}>
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{profile.name || "Your Name"}</Text>
        <Text style={s.contact}>{contactLine(profile)}</Text>

        {r.summary ? (
          <Section title="Professional Summary">
            <Text style={s.summary}>{r.summary}</Text>
          </Section>
        ) : null}

        {profile.education.length ? (
          <Section title="Education">
            {profile.education.map((e, i) => (
              <View key={i} style={s.entry} wrap={false}>
                <View style={s.rowBetween}>
                  <Text style={s.org}>{e.school}</Text>
                  {e.dates ? <Text style={s.right}>{e.dates}</Text> : null}
                </View>
                {(e.degree || e.location) && (
                  <View style={s.rowBetween}>
                    <Text style={s.title}>{e.degree ?? ""}</Text>
                    {e.location ? <Text style={s.right}>{e.location}</Text> : null}
                  </View>
                )}
              </View>
            ))}
          </Section>
        ) : null}

        {r.experiences.length ? (
          <Section title="Experience">
            {r.experiences.map((e, i) => <ExpEntry key={i} e={e} />)}
          </Section>
        ) : null}

        {profile.positions.length ? (
          <Section title="Position of Responsibility">
            {profile.positions.map((e, i) => <ExpEntry key={i} e={e} />)}
          </Section>
        ) : null}

        {r.projects.length ? (
          <Section title="Projects">
            {r.projects.map((p, i) => {
              const right = [p.role, p.date].filter(Boolean).join("  ·  ");
              const lines = p.bullets.length ? p.bullets : p.summary ? [p.summary] : [];
              return (
                <View key={i} style={s.entry} wrap={false}>
                  <View style={s.rowBetween}>
                    <Text style={s.org}>{p.name}</Text>
                    {right ? <Text style={s.right}>{right}</Text> : null}
                  </View>
                  {p.stack.length ? (
                    <Text style={s.title}>{p.stack.join(", ")}</Text>
                  ) : null}
                  {lines.map((b, n) => (
                    <View key={n} style={s.bullet}>
                      <Text style={s.bulletDot}>•</Text>
                      <Text style={s.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              );
            })}
          </Section>
        ) : null}

        {r.skills.length ? (
          <Section title="Skills">
            {grouped ? (
              grouped.map((g, i) => (
                <View key={i} style={s.skillRow}>
                  <Text style={s.skillCat}>{g.cat}</Text>
                  <Text style={s.skillVals}>{g.names.join("  ·  ")}</Text>
                </View>
              ))
            ) : (
              <Text style={s.skillVals}>{r.skills.map((x) => x.name).join("  ·  ")}</Text>
            )}
          </Section>
        ) : null}

        {profile.certifications.length ? (
          <Section title="Certifications">
            {profile.certifications.map((c, i) => (
              <View key={i} style={s.bullet}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>
                  {c.name}
                  {c.issuer ? ` — ${c.issuer}` : ""}
                  {c.date ? ` (${c.date})` : ""}
                </Text>
              </View>
            ))}
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
