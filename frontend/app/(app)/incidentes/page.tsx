import { getSummary } from "@/lib/api";
import { IncidentsView } from "../../_components/views";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <IncidentsView data={await getSummary()} fetchedAt={new Date().toISOString()} />;
}
