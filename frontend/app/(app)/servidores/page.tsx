import { getSummary } from "@/lib/api";
import { ServersView } from "../../_components/views";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <ServersView data={await getSummary()} fetchedAt={new Date().toISOString()} />;
}
