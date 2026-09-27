import { getSummary } from "@/lib/api";
import { OverviewView } from "../_components/views";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <OverviewView data={await getSummary()} fetchedAt={new Date().toISOString()} />;
}
