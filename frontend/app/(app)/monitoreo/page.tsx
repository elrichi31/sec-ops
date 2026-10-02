import { getMonitoring, getSummary } from "@/lib/api";
import { MonitoringView } from "../../_components/monitoring";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [data, monitoring] = await Promise.all([getSummary(), getMonitoring()]);
  return <MonitoringView data={data} monitoring={monitoring} fetchedAt={new Date().toISOString()} />;
}
