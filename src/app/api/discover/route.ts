import { NextResponse } from "next/server";
import { searchAllSources } from "@/lib/discovery/sources";
import type { DiscoveryQuery } from "@/lib/discovery/types";

export const dynamic = "force-dynamic";
const lastRequestByIp = new Map<string, number>();
const clean = (value: unknown) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) : "";

export async function POST(request: Request) {
  let body: Partial<DiscoveryQuery>;
  try { body = await request.json() as Partial<DiscoveryQuery>; }
  catch { return NextResponse.json({ error: "Invalid search request." }, { status: 400 }); }

  const query: DiscoveryQuery = { category: clean(body.category), keywords: clean(body.keywords), state: clean(body.state), city: clean(body.city) };
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
