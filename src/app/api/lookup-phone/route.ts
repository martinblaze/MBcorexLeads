import { NextResponse } from "next/server";
import { findPublicBusinessPhone } from "@/lib/discovery/sources";

export const dynamic = "force-dynamic";
const lastRequestByIp = new Map<string, number>();
const clean = (value: unknown) => typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 120) : "";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json() as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid phone lookup request." }, { status: 400 }); }

  const name = clean(body.name);
  const city = clean(body.city);
  const state = clean(body.state);
  if (!name) return NextResponse.json({ error: "Business name is required." }, { status: 400 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  if (now - (lastRequestByIp.get(ip) || 0) < 1500) {
    return NextResponse.json({ error: "Please wait briefly before looking up another number." }, { status: 429 });
  }
  lastRequestByIp.set(ip, now);

  const match = await findPublicBusinessPhone(name, city, state);
  return NextResponse.json(match || { phone: null }, { headers: { "Cache-Control": "private, no-store" } });
}
