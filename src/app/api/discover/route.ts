import { NextResponse } from "next/server";
import { searchAllSources } from "@/lib/discovery/sources";
import type { DiscoveryQuery } from "@/lib/discovery/types";

export const dynamic = "force-dynamic";
const lastRequestByIp = new Map<string, number>();
const clean = (value: unknown) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) : "";
function validateCursor(value: unknown, origin: string, pathname: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new Error("Invalid pagination cursor.");
  try {
    const cursor = new URL(value);
    if (cursor.origin !== origin || cursor.pathname !== pathname) throw new Error("Invalid pagination cursor.");
    return cursor.toString();
  } catch { throw new Error("Invalid pagination cursor."); }
}

export async function POST(request: Request) {
  let body: Partial<DiscoveryQuery>;
  try { body = await request.json() as Partial<DiscoveryQuery>; }
  catch { return NextResponse.json({ error: "Invalid search request." }, { status: 400 }); }

  let cursors: DiscoveryQuery["cursors"];
  try {
    cursors = {
      indexNg: validateCursor(body.cursors?.indexNg, "https://index.ng", "/businesses"),
      naijaBased: validateCursor(body.cursors?.naijaBased, "https://api.naijabased.fun", "/places.php"),
    };
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid pagination cursor." }, { status: 400 });
  }
  const continuation = body.continuation === true;
  if (continuation && !cursors?.indexNg && !cursors?.naijaBased) {
    return NextResponse.json({ error: "There are no more directory pages to load." }, { status: 400 });
  }
  const query: DiscoveryQuery = { category: clean(body.category), keywords: clean(body.keywords), state: clean(body.state), city: clean(body.city), continuation, cursors };
  if (!query.category && !query.keywords && !query.city && !query.state) {
    return NextResponse.json({ error: "Enter a category, keyword, state or city." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (now - (lastRequestByIp.get(ip) || 0) < 1500) {
    return NextResponse.json({ error: "Please wait briefly before starting another directory search." }, { status: 429 });
  }
  lastRequestByIp.set(ip, now);
  if (lastRequestByIp.size > 500) {
    for (const [key, time] of lastRequestByIp) if (now - time > 60_000) lastRequestByIp.delete(key);
  }

  const result = await searchAllSources(query);
  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
