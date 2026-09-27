import "server-only";

export type Val = string | number | null;
export type Row = Record<string, Val>;
export type Summary = {
  servers: Row[];
  statuses: Row[];
  topIps: Row[];
  events: Row[];
  incidents: Row[];
  timeline: Row[];
  rules: Row[];
  topPaths: Row[];
  services: Row[];
  methods: Row[];
  probes: Row[];
  totals: Row;
};

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${process.env.API_URL}${path}`, {
    headers: { authorization: `Bearer ${process.env.DASHBOARD_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const getSummary = () => api<Summary>("/api/dashboard");
export const searchEvents = (q: string) => api<Row[]>(`/api/search?q=${encodeURIComponent(q)}`);
