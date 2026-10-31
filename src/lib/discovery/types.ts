export type DiscoveryQuery = {
  category: string;
  keywords: string;
  state: string;
  city: string;
  continuation?: boolean;
  cursors?: { indexNg?: string | null; naijaBased?: string | null };
};

export type DiscoveredBusiness = {
  name: string;
  category: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  website: string;
  source: string;
  sourceUrl: string;
};

export type SourceStatus = {
  source: string;
  status: "complete" | "unavailable";
  count: number;
  message: string;
  nextCursor?: string | null;
};
