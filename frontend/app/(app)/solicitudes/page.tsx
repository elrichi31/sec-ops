import { getSummary, searchEvents } from "@/lib/api";
import { EventsView } from "../../_components/views";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const [data, results] = await Promise.all([getSummary(), q ? searchEvents(q) : null]);
  return <EventsView data={data} fetchedAt={new Date().toISOString()} q={q} results={results} />;
}
