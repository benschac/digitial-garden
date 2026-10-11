import { realpath } from "node:fs/promises";
import path from "node:path";
import { fromFile } from "@capsizecss/unpack/fs";

export const runtime = "nodejs";

// Only compiled, self-hosted font assets can be inspected. Never accept a URL
// to fetch or an arbitrary filesystem path from the browser.
function isFontAssetName(value: string) {
  return /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*\.(woff2?|otf|ttf)$/.test(value);
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404 });
  }
  const asset = new URL(request.url).searchParams.get("asset") ?? "";
  if (!isFontAssetName(asset)) {
    return Response.json({ error: "Invalid font asset" }, { status: 400 });
  }
  try {
    const directory = await realpath(
      path.join(process.cwd(), ".next/dev/static/media"),
    );
    const file = await realpath(path.join(directory, asset));
    if (path.dirname(file) !== directory) {
      return new Response(null, { status: 400 });
    }
    return Response.json({
      metrics: await fromFile(file),
      source: `/_next/static/media/${asset}`,
    });
  } catch {
    return Response.json(
      { error: "Font metrics could not be extracted" },
      { status: 422 },
    );
  }
}
