"use client";

import { useState } from "react";
import type { ProfileContext } from "@/lib/types";
import { ProfileEditor } from "./ProfileEditor";
import { Generator } from "./Generator";

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
  const [tab, setTab] = useState<"profile" | "generate">("profile");

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        {(["profile", "generate"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize transition ${
              tab === t
                ? "border-black dark:border-white"
                : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {t === "generate" ? "Generate" : "Profile"}
          </button>
        ))}
      </nav>

      {tab === "profile" ? (
        <ProfileEditor
          token={token}
          profile={profile}
          hasVoice={hasVoice}
          onChange={setProfile}
          onVoiceSaved={() => setHasVoice(true)}
        />
      ) : (
        <Generator token={token} profile={profile} hasVoice={hasVoice} />
      )}
    </div>
  );
}
