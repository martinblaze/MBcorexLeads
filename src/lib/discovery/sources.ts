import * as cheerio from "cheerio";
import type { DiscoveredBusiness, DiscoveryQuery, SourceStatus } from "./types";

const USER_AGENT = "MBCoreXLeads/1.0 (+https://mbcorex.vercel.app)";
const timeout = (ms = 9000) => AbortSignal.timeout(ms);
const clean = (value: string, limit = 120) => value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit);
const sourceQuery = (query: DiscoveryQuery) => clean([query.category, query.keywords, query.city].filter(Boolean).join(" "), 200);
const failed = (source: string, error: unknown): SourceStatus => ({ source, status: "unavailable", count: 0, message: error instanceof Error ? error.message : "Source request failed" });

async function fetchHtml(url: URL) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
    signal: timeout(),
    next: { revalidate: 300 },
  });
  if (!response.ok) throw new Error(response.status === 403 ? "The directory denied this request (HTTP 403)." : `Directory returned HTTP ${response.status}.`);
  return response.text();
}

async function collectIndex(query: DiscoveryQuery): Promise<{ status: SourceStatus; businesses: DiscoveredBusiness[] }> {
  const url = new URL("https://index.ng/businesses");
  const search = sourceQuery(query);
  if (search) url.searchParams.set("q", search);
  if (query.state) url.searchParams.set("state", query.state.toLowerCase());
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const businesses: DiscoveredBusiness[] = [];
    $('a[href^="/b/"]').each((_, anchor) => {
      if (businesses.length >= 20) return false;
      const link = $(anchor);
      const card = link.closest("article").length ? link.closest("article") : link.parent().parent();
      const name = clean(card.find("h2,h3").first().text() || link.text());
      if (!name) return;
      const detail = clean(card.text(), 500);
      const locationMatch = detail.match(/\s·\s([^·]+)$/);
      businesses.push({ name, category: "", city: "", state: query.state, phone: "", email: "", website: "", source: "Index.ng", sourceUrl: new URL(link.attr("href")!, "https://index.ng").toString() });
      const last = businesses[businesses.length - 1];
      if (locationMatch) last.city = clean(locationMatch[1]);
    });
    return { status: { source: "Index.ng", status: "complete", count: businesses.length, message: "Public directory search completed." }, businesses };
  } catch (error) {
    return { status: failed("Index.ng", error), businesses: [] };
  }
}

async function collectNaijaBased(query: DiscoveryQuery): Promise<{ status: SourceStatus; businesses: DiscoveredBusiness[] }> {
  const url = new URL("https://api.naijabased.fun/places.php");
  const search = sourceQuery(query);
  if (search) url.searchParams.set("search", search);
  if (query.state) url.searchParams.set("state", query.state);
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const businesses: DiscoveredBusiness[] = [];
    $("#businesses-list .item-card").each((_, element) => {
      if (businesses.length >= 20) return false;
      const card = $(element);
      const name = clean(card.find(".item-title").first().text());
      if (!name) return;
      const category = clean(card.find(".seller-info p").first().text());
      const location = clean(card.find(".item-location").first().text());
      const [city = "", state = ""] = location.split(",").map(clean);
      const click = card.attr("onclick") || "";
      const path = click.match(/(?:window\.location\.href\s*=\s*|location\.href\s*=\s*)['"]([^'"]+)['"]/i)?.[1];
      const phoneAction = card.find('button[onclick*="revealContact"]').first().attr("onclick") || "";
      const phone = phoneAction.match(/revealContact\(\s*['"]phone['"]\s*,\s*\d+\s*,\s*['"]([^'"]+)['"]\s*\)/i)?.[1] || "";
      businesses.push({
        name,
        category,
        city,
        state,
        phone: clean(phone, 30),
        email: "",
        website: "",
        source: "NaijaBased",
        sourceUrl: path ? new URL(path, "https://www.naijabased.fun").toString() : url.toString(),
      });
    });
    return { status: { source: "NaijaBased", status: "complete", count: businesses.length, message: "Public business directory search completed." }, businesses };
  } catch (error) {
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
  const results = await Promise.all([collectIndex(query), collectNaijaBased(query), collectNovovibe(query)]);
  return {
    sources: results.map(result => result.status),
    businesses: results.flatMap(result => result.businesses),
  };
}
