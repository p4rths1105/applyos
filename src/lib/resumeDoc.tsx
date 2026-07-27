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

// A clean, ATS-friendly one-page resume that mirrors a standard student/PM
// resume: centered header, section rules, right-aligned dates/locations, bold
// orgs, italic titles, clickable links. Uses built-in Helvetica (no font files
// to load — safe on serverless). Rendered server-side to a real PDF, so there's
// no browser print header/footer and no accidental multi-page overflow.

const s = StyleSheet.create({
  page: {
    paddingVertical: 34,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#111",
    lineHeight: 1.35,
  },
  name: { fontSize: 19, fontFamily: "Helvetica-Bold", textAlign: "center" },
  contact: {
    fontSize: 9,
    textAlign: "center",
    color: "#333",
    marginTop: 4,
  },
  link: { color: "#1a4fd6", textDecoration: "none" },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#111",
    paddingBottom: 2,
    marginTop: 12,
    marginBottom: 5,
  },
  summary: { fontSize: 9.5, color: "#222" },
  entry: { marginBottom: 6 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  org: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  right: { fontSize: 9, color: "#444" },
  title: { fontSize: 9.5, fontFamily: "Helvetica-Oblique", color: "#222" },
  bullet: { flexDirection: "row", marginTop: 2, paddingRight: 4 },
  bulletDot: { width: 10, fontSize: 9.5 },
  bulletText: { flex: 1, fontSize: 9.5 },
  skills: { fontSize: 9.5 },
});

function contactLine(p: ProfileContext) {
  const bits: React.ReactNode[] = [];
  const push = (node: React.ReactNode) => {
    if (bits.length) bits.push(<Text key={`sep${bits.length}`}> · </Text>);
    bits.push(node);
  };
  if (p.contact.email) push(<Text key="email">{p.contact.email}</Text>);
  if (p.contact.phone) push(<Text key="phone">{p.contact.phone}</Text>);
  if (p.contact.location) push(<Text key="loc">{p.contact.location}</Text>);
  if (p.links.github)
    push(
      <Link key="gh" src={p.links.github} style={s.link}>
        GitHub
      </Link>,
    );
  if (p.links.linkedin)
    push(
      <Link key="li" src={p.links.linkedin} style={s.link}>
        LinkedIn
      </Link>,
    );
  if (p.links.portfolio)
    push(
      <Link key="pf" src={p.links.portfolio} style={s.link}>
        Portfolio
      </Link>,
    );
  return bits;
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
      <View style={s.rowBetween}>
        <Text style={s.title}>{e.title}</Text>
        {e.location ? <Text style={s.right}>{e.location}</Text> : null}
      </View>
      {e.bullets.map((b, i) => (
        <View key={i} style={s.bullet}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </View>
  );
}

// Apply a tailored ordering/filter to experiences & projects; null = master (all).
function resolve(profile: ProfileContext, tailored: TailoredResume | null) {
  if (!tailored) {
    return {
      summary: profile.summary,
      experiences: profile.experiences,
      projects: profile.projects,
      skills: profile.skills.map((s) => s.name),
    };
  }
  const expByKey = new Map(
    profile.experiences.map((e) => [`${e.title} @ ${e.org}`, e]),
  );
  const projByName = new Map(profile.projects.map((p) => [p.name, p]));
  const experiences = tailored.orderedExperienceTitles
    .map((k) => expByKey.get(k))
    .filter((e): e is ExperienceItem => Boolean(e));
  const projects = tailored.orderedProjectNames
    .map((n) => projByName.get(n))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  return {
    summary: tailored.summary || profile.summary,
    experiences: experiences.length ? experiences : profile.experiences,
    projects: projects.length ? projects : profile.projects,
    skills: tailored.includedSkillNames.length
      ? tailored.includedSkillNames
      : profile.skills.map((s) => s.name),
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
            {r.experiences.map((e, i) => (
              <ExpEntry key={i} e={e} />
            ))}
          </Section>
        ) : null}

        {profile.positions.length ? (
          <Section title="Position of Responsibility">
            {profile.positions.map((e, i) => (
              <ExpEntry key={i} e={e} />
            ))}
          </Section>
        ) : null}

        {r.projects.length ? (
          <Section title="Projects">
            {r.projects.map((p, i) => (
              <View key={i} style={s.entry} wrap={false}>
                <View style={s.rowBetween}>
                  <Text style={s.org}>{p.name}</Text>
                  {p.stack.length ? (
                    <Text style={s.right}>{p.stack.join(", ")}</Text>
                  ) : null}
                </View>
                {p.summary ? (
                  <View style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{p.summary}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </Section>
        ) : null}

        {r.skills.length ? (
          <Section title="Skills">
            <Text style={s.skills}>{r.skills.join("  ·  ")}</Text>
          </Section>
        ) : null}

        {profile.certifications.length ? (
          <Section title="Certifications">
            {profile.certifications.map((c, i) => (
              <Text key={i} style={s.summary}>
                • {c.name}
                {c.issuer ? ` — ${c.issuer}` : ""}
                {c.date ? ` (${c.date})` : ""}
              </Text>
            ))}
          </Section>
        ) : null}
      </Page>
    </Document>
  );
}
