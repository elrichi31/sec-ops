import Dashboard, { type Summary } from "./dashboard";

export const dynamic = "force-dynamic";

async function getSummary(): Promise<Summary> {
  const res = await fetch(`${process.env.API_URL}/api/dashboard`, {
    headers: { authorization: `Bearer ${process.env.DASHBOARD_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export default async function Home() {
  return <Dashboard data={await getSummary()} fetchedAt={new Date().toISOString()} />;
}
