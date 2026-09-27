import { getSummary } from "@/lib/api";
import { IpsView } from "../../_components/views";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <IpsView data={await getSummary()} fetchedAt={new Date().toISOString()} />;
}
