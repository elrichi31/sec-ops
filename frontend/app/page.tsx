import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Row = Record<string, string | number | null>;
type Summary = {
  servers: Row[];
  statuses: Row[];
  topIps: Row[];
  events: Row[];
  incidents: Row[];
};

async function getSummary(): Promise<Summary> {
  const res = await fetch(`${process.env.API_URL}/api/dashboard`, {
    headers: { authorization: `Bearer ${process.env.DASHBOARD_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

const time = (v: Row[string]) => (v ? new Date(String(v)).toLocaleString() : "—");

function Table({ rows, cols }: { rows: Row[]; cols: [string, string][] }) {
  if (!rows.length) return <p className={styles.empty}>Sin datos</p>;
  return (
    <div className={styles.scroll}>
      <table>
        <thead>
          <tr>{cols.map(([, label]) => <th key={label}>{label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {cols.map(([key]) => (
                <td key={key}>{/(_at|^ts)$/.test(key) ? time(r[key]) : (r[key] ?? "—")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Home() {
  const d = await getSummary();
  return (
    <main className={styles.main}>
      {/* ponytail: full-page refresh every 10s; swap for SSE when it matters */}
      <meta httpEquiv="refresh" content="10" />
      <h1>Zenlor Security Monitor</h1>

      <section>
        <h2>Incidentes</h2>
        <Table
          rows={d.incidents}
          cols={[["created_at", "Fecha"], ["rule", "Regla"], ["server", "Servidor"], ["client_ip", "IP"], ["hits", "Hits"], ["sample_path", "Ruta"]]}
        />
      </section>

      <div className={styles.grid}>
        <section>
          <h2>Servidores</h2>
          <Table rows={d.servers} cols={[["name", "Nombre"], ["last_seen_at", "Último evento"]]} />
        </section>
        <section>
          <h2>Códigos HTTP (24h)</h2>
          <Table rows={d.statuses} cols={[["status_code", "Código"], ["total", "Total"]]} />
        </section>
        <section>
          <h2>Top IPs (24h)</h2>
          <Table rows={d.topIps} cols={[["client_ip", "IP"], ["total", "Solicitudes"]]} />
        </section>
      </div>

      <section>
        <h2>Últimas solicitudes</h2>
        <Table
          rows={d.events}
          cols={[["ts", "Fecha"], ["server", "Servidor"], ["source", "Fuente"], ["service", "Servicio"], ["client_ip", "IP"], ["method", "Método"], ["path", "Ruta"], ["status_code", "Código"], ["duration_ms", "ms"]]}
        />
      </section>
    </main>
  );
}
