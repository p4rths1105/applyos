import { notFound } from "next/navigation";
import { loadProfileContext } from "@/lib/profile";
import { Workspace } from "./Workspace";

export default async function TokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const profile = await loadProfileContext(token);
  if (!profile) notFound();

  const hasVoice = profile.voiceProfile != null;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">ApplyOS</h1>
        <p className="text-sm text-neutral-400">
          Your private workspace. Bookmark this URL.
        </p>
      </header>
      <Workspace token={token} initialProfile={profile} initialHasVoice={hasVoice} />
    </main>
  );
}
