import { renderToBuffer } from "@react-pdf/renderer";
import { ResumeDocument } from "@/lib/resumeDoc";
import { loadProfileContext } from "@/lib/profile";
import type { TailoredResume } from "@/lib/types";

export const runtime = "nodejs";

// GET  -> master resume (whole profile). POST (JSON TailoredResume) -> tailored.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  return renderResume(token, null);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  let tailored: TailoredResume | null = null;
  try {
    tailored = (await req.json()) as TailoredResume;
  } catch {
    tailored = null;
  }
  return renderResume(token, tailored);
}

async function renderResume(token: string, tailored: TailoredResume | null) {
  const profile = await loadProfileContext(token);
  if (!profile) return new Response("Not found", { status: 404 });

  const buffer = await renderToBuffer(
    ResumeDocument({ profile, tailored }),
  );
  const name = (profile.name || "resume").replace(/[^a-z0-9]+/gi, "_");
  const suffix = tailored ? "_tailored" : "";
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${name}${suffix}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
