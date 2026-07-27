"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProfileContext } from "@/lib/types";
import { Brand } from "../Brand";
import { ProfileEditor } from "./ProfileEditor";
import { Apply } from "./Apply";
import { ResumeTab } from "./ResumeTab";

type Tab = "resume" | "profile" | "apply";

export function Workspace({
  token,
  initialProfile,
  initialHasVoice,
}: {
  token: string;
  initialProfile: ProfileContext;
  initialHasVoice: boolean;
}) {
  const [profile, setProfile] = useState<ProfileContext>(initialProfile);
  const [hasVoice, setHasVoice] = useState(initialHasVoice);

  const isEmpty =
    !profile.name &&
    profile.experiences.length === 0 &&
    profile.projects.length === 0;
  const [tab, setTab] = useState<Tab>(isEmpty ? "profile" : "resume");

  const tabs: { id: Tab; label: string }[] = [
    { id: "resume", label: "Resume" },
    { id: "profile", label: "Profile" },
    { id: "apply", label: "Apply" },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/85 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/85">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <Link href={`/${token}`}>
            <Brand />
          </Link>
          <nav className="flex items-center gap-1 rounded-full bg-neutral-100 p-1 text-sm dark:bg-neutral-900">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-1.5 font-medium transition ${
                  tab === t.id
                    ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {tab === "resume" && (
          <ResumeTab token={token} profile={profile} onGoToProfile={() => setTab("profile")} />
        )}
        {tab === "profile" && (
          <ProfileEditor
            token={token}
            profile={profile}
            hasVoice={hasVoice}
            onChange={setProfile}
            onVoiceSaved={() => setHasVoice(true)}
          />
        )}
        {tab === "apply" && (
          <Apply token={token} profile={profile} hasVoice={hasVoice} />
        )}
      </main>
    </div>
  );
}
