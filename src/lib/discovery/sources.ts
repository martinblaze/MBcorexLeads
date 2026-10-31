import * as cheerio from "cheerio";
import type { DiscoveredBusiness, DiscoveryQuery, SourceStatus } from "./types";

const USER_AGENT = "MBCoreXLeads/1.0 (+https://mbcorex.vercel.app)";
const timeout = (ms = 9000) => AbortSignal.timeout(ms);
const clean = (value: string, limit = 120) => value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
const sourceQuery = (query: DiscoveryQuery) => clean([query.category, query.keywords, query.city].filter(Boolean).join(" "), 200);
const failed = (source: string, error: unknown): SourceStatus => ({ source, status: "unavailable", count: 0, message: error instanceof Error ? error.message : "Source request failed" });
const safeCursor = (value: string | null | undefined, origin: string, pathname: string) => {
  if (!value) return null;
  try {
    const cursor = new URL(value);
    return cursor.origin === origin && cursor.pathname === pathname ? cursor : null;
  } catch { return null; }
};
const skipped = (source: string): { status: SourceStatus; businesses: DiscoveredBusiness[] } => ({
  status: { source, status: "complete", count: 0, message: "No more pages from this directory.", nextCursor: null },
  businesses: [],
});
const nextPage = ($: cheerio.CheerioAPI, current: URL) => {
  const anchors = $("a").toArray().map(anchor => {
    const link = $(anchor);
    const href = link.attr("href");
    if (!href) return null;
    const candidate = new URL(href, current);
    if (candidate.origin !== current.origin || candidate.pathname !== current.pathname) return null;
    const label = clean(link.text()).toLowerCase();
    const accessibleLabel = link.attr("aria-label")?.toLowerCase() || "";
    return { candidate, label, accessibleLabel };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  const next = anchors.find(entry => entry.candidate.href !== current.href && (/^next\b|^[›»→]/i.test(entry.label) || entry.accessibleLabel.includes("next")));
  if (next) return next.candidate;

  for (const key of ["page", "p", "offset", "start"]) {
    const currentValue = Number(current.searchParams.get(key) || 0);
    const candidates = anchors
      .map(entry => ({ ...entry, value: Number(entry.candidate.searchParams.get(key)) }))
      .filter(entry => entry.candidate.href !== current.href && Number.isFinite(entry.value) && entry.value > currentValue)
      .sort((a, b) => a.value - b.value);
    if (candidates.length) return candidates[0].candidate;
  }
  return null;
};

async function fetchHtml(url: URL) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    signal: timeout(),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(response.status === 403 ? "The directory denied this request (HTTP 403)." : `Directory returned HTTP ${response.status}.`);
  return response.text();
}

async function collectIndex(query: DiscoveryQuery, cursor?: string | null): Promise<{ status: SourceStatus; businesses: DiscoveredBusiness[] }> {
  const url = safeCursor(cursor, "https://index.ng", "/businesses") || new URL("https://index.ng/businesses");
  const search = sourceQuery(query);
  if (!cursor) {
    if (search) url.searchParams.set("q", search);
    if (query.state) url.searchParams.set("state", query.state.toLowerCase());
  }
  const businesses: DiscoveredBusiness[] = [];
  let page: URL | null = url;
  try {
    const seen = new Set<string>();
    for (let pageNumber = 0; page && pageNumber < 5; pageNumber++) {
      if (pageNumber) await new Promise(resolve => setTimeout(resolve, 500));
      const current: URL = page;
      const $ = cheerio.load(await fetchHtml(current));
      $('a[href^="/b/"]').each((_, anchor) => {
        if (businesses.length >= 100) return false;
        const link = $(anchor);
        const sourceUrl = new URL(link.attr("href")!, "https://index.ng").toString();
        if (seen.has(sourceUrl)) return;
        const card = link.closest("article").length ? link.closest("article") : link.parent().parent();
        const name = clean((link.text() || card.find("h2,h3").first().text()).replace(/^\d{1,3}\s*/, ""));
        if (!name) return;
        const detail = clean(card.text(), 800).replace(/\b(?:Open now|Open 24 hours|View|Claim this listing|Report this listing)\b/gi, " ");
        const [identity = "", rawLocation = ""] = detail.split(/[·•]/, 2);
        const category = clean(identity.replace(name, "").replace(/^\d{1,3}\s*/, ""));
        const [city = "", state = query.state] = clean(rawLocation).split(",").map(clean);
        seen.add(sourceUrl);
        businesses.push({ name, category, city, state, phone: "", email: "", website: "", source: "Index.ng", sourceUrl });
      });
      page = businesses.length < 100 ? nextPage($, current) : null;
    }
    return { status: { source: "Index.ng", status: "complete", count: businesses.length, message: "Checked up to five pages in this batch.", nextCursor: page?.toString() || null }, businesses };
  } catch (error) {
    if (businesses.length) return { status: { source: "Index.ng", status: "complete", count: businesses.length, message: `Returned ${businesses.length} matches; a later page failed: ${error instanceof Error ? error.message : "request failed"}`, nextCursor: page?.toString() || null }, businesses };
    return { status: failed("Index.ng", error), businesses: [] };
  }
}

async function collectNaijaBased(query: DiscoveryQuery, cursor?: string | null): Promise<{ status: SourceStatus; businesses: DiscoveredBusiness[] }> {
  const url = safeCursor(cursor, "https://api.naijabased.fun", "/places.php") || new URL("https://api.naijabased.fun/places.php");
  const search = sourceQuery(query);
  if (!cursor) {
    if (search) url.searchParams.set("search", search);
    if (query.state) url.searchParams.set("state", query.state);
  }
  const businesses: DiscoveredBusiness[] = [];
  let page: URL | null = url;
  try {
    const seen = new Set<string>();
    for (let pageNumber = 0; page && pageNumber < 5; pageNumber++) {
      if (pageNumber) await new Promise(resolve => setTimeout(resolve, 500));
      const current: URL = page;
      const $ = cheerio.load(await fetchHtml(current));
      $("#businesses-list .item-card").each((_, element) => {
        if (businesses.length >= 100) return false;
        const card = $(element);
        const name = clean(card.find(".item-title").first().text());
        if (!name) return;
        const category = clean(card.find(".seller-info p").first().text());
        const location = clean(card.find(".item-location").first().text());
        const [city = "", state = ""] = location.split(",").map(clean);
        const click = card.attr("onclick") || "";
        const profileLink = card.find("a[href]").toArray().map(anchor => $(anchor).attr("href") || "").find(href => /^\/(?:biz|business)\//i.test(href));
        const path = click.match(/(?:window\.location\.href\s*=\s*|location\.href\s*=\s*)['"]([^'"]+)['"]/i)?.[1] || profileLink;
        const sourceUrl = path ? new URL(path, "https://www.naijabased.fun").toString() : current.toString();
        const key = `${sourceUrl}|${name.toLowerCase()}|${city.toLowerCase()}`;
        if (seen.has(key)) return;
        const phoneAction = card.find('button[onclick*="revealContact"]').first().attr("onclick") || "";
        const phone = phoneAction.match(/revealContact\(\s*['"]phone['"]\s*,\s*\d+\s*,\s*['"]([^'"]+)['"]\s*\)/i)?.[1] || "";
        seen.add(key);
        businesses.push({ name, category, city, state, phone: clean(phone, 30), email: "", website: "", source: "NaijaBased", sourceUrl });
      });
      page = businesses.length < 100 ? nextPage($, current) : null;
    }
    return { status: { source: "NaijaBased", status: "complete", count: businesses.length, message: "Checked up to five pages in this batch.", nextCursor: page?.toString() || null }, businesses };
  } catch (error) {
    if (businesses.length) return { status: { source: "NaijaBased", status: "complete", count: businesses.length, message: `Returned ${businesses.length} matches; a later page failed: ${error instanceof Error ? error.message : "request failed"}`, nextCursor: page?.toString() || null }, businesses };
    return { status: failed("NaijaBased", error), businesses: [] };
  }
}

async function collectNovovibe(query: DiscoveryQuery): Promise<{ status: SourceStatus; businesses: DiscoveredBusiness[] }> {
  const url = new URL("https://api.novovibe.com/en/search");
  const search = clean([query.category, query.keywords, query.city, query.state, "Nigeria"].filter(Boolean).join(" "), 200);
  if (!search) throw new Error("Enter a category or keyword to search for new openings.");
  url.searchParams.set("q", search);
  url.searchParams.set("country", "nigeria");
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: timeout(),
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Novovibe returned HTTP ${response.status}.`);
    const payload: unknown = await response.json();
    const rows = Array.isArray(payload) ? payload : [];
    const businesses: DiscoveredBusiness[] = rows.filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && (row as Record<string, unknown>).type === "place").slice(0, 12).map(row => {
      const url = typeof row.url === "string" ? row.url : "https://novovibe.com/en/nigeria";
      return {
        name: clean(typeof row.name === "string" ? row.name : ""),
        category: clean(typeof row.category === "string" ? row.category : typeof row.tagline === "string" ? row.tagline : "Newly opened place"),
        city: clean(typeof row.city === "string" ? row.city : typeof row.cityName === "string" ? row.cityName : ""),
        state: "",
        phone: "",
        email: "",
        website: "",
        source: "Novovibe",
        sourceUrl: /^https:\/\/novovibe\.com\//.test(url) ? url : "https://novovibe.com/en/nigeria",
      };
    }).filter(row => row.name);
    return { status: { source: "Novovibe", status: "complete", count: businesses.length, message: "New openings search completed (up to 12 results)." }, businesses };
  } catch (error) {
    return { status: failed("Novovibe", error), businesses: [] };
  }
}

export async function searchAllSources(query: DiscoveryQuery) {
  const results = await Promise.all([
    query.continuation && !query.cursors?.indexNg ? Promise.resolve(skipped("Index.ng")) : collectIndex(query, query.continuation ? query.cursors?.indexNg : null),
    query.continuation && !query.cursors?.naijaBased ? Promise.resolve(skipped("NaijaBased")) : collectNaijaBased(query, query.continuation ? query.cursors?.naijaBased : null),
    query.continuation ? Promise.resolve(skipped("Novovibe")) : collectNovovibe(query),
  ]);
  return {
    sources: results.map(result => result.status),
    businesses: results.flatMap(result => result.businesses),
    cursors: {
      indexNg: results[0].status.nextCursor || null,
      naijaBased: results[1].status.nextCursor || null,
    },
  };
}
