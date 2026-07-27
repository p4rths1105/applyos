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

  return (
    <Workspace
      token={token}
      initialProfile={profile}
      initialHasVoice={profile.voiceProfile != null}
    />
  );
}
