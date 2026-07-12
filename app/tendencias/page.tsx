import Link from "next/link";
import { supabaseServer, type Concorrente, type Snapshot } from "@/lib/supabase";
import { fmt } from "@/lib/ui";

export const dynamic = "force-dynamic";

const SEMANA = 7 * 86400000;

function taxaSemanal(primeiro: Snapshot, ultimo: Snapshot): number | null {
  if (primeiro.seguidores == null || ultimo.seguidores == null) return null;
  const dt = Date.parse(ultimo.coletado_em) - Date.parse(primeiro.coletado_em);
  if (dt <= 0) return null;
  return ((ultimo.seguidores - primeiro.seguidores) / dt) * SEMANA;
}

export default async function Tendencias() {
  const sb = supabaseServer();
  const [{ data: c }, { data: s }] = await Promise.all([
    sb.from("concorrentes").select("*").order("criado_em"),
    sb.from("snapshots").select("*").order("coletado_em", { ascending: true }),
  ]);
  const concorrentes = (c as Concorrente[]) ?? [];
  const snapshots = (s as Snapshot[]) ?? [];

  const linhas = concorrentes.map((conc) => {
    const hist = snapshots.filter((sn) => sn.concorrente_id === conc.id && sn.seguidores != null);
    if (hist.length < 2) return { conc, seguidores: hist[hist.length - 1]?.seguidores ?? null, taxa: null, tendencia: null as string | null };
    const taxa = taxaSemanal(hist[0], hist[hist.length - 1]);
    const recente = taxaSemanal(hist[hist.length - 2], hist[hist.length - 1]);
    let tendencia: string | null = null;
    if (taxa != null && recente != null) {
      if (recente > taxa * 1.1) tendencia = "acelerando";
      else if (recente < taxa * 0.9) tendencia = "desacelerando";
      else tendencia = "estável";
    }
    return { conc, seguidores: hist[hist.length - 1].seguidores, taxa, tendencia };
  }).sort((a, b) => (b.taxa ?? -Infinity) - (a.taxa ?? -Infinity));

  return (
    <main>
      <h1>📈 Tendências</h1>
      <p className="muted">Ranking de crescimento: quem ganha seguidores mais rápido por semana, e quem está acelerando ou desacelerando.</p>

      <div className="painel" style={{ marginTop: 24, padding: 12 }}>
        {linhas.length ? (
          <table>
            <thead>
              <tr><th>#</th><th>Concorrente</th><th>Seguidores</th><th>Δ / semana</th><th>Tendência</th></tr>
            </thead>
            <tbody>
              {linhas.map(({ conc, seguidores, taxa, tendencia }, i) => (
                <tr key={conc.id}>
                  <td>{i + 1}</td>
                  <td><Link href={`/concorrente/${conc.id}`} style={{ color: "var(--berry)", fontWeight: 700 }}>{conc.nome}</Link></td>
                  <td>{seguidores != null ? fmt.format(seguidores) : "—"}</td>
                  <td className={taxa != null ? (taxa >= 0 ? "delta-up" : "delta-down") : ""}>
                    {taxa != null ? `${taxa >= 0 ? "▲" : "▼"} ${fmt.format(Math.abs(Math.round(taxa)))}` : "precisa de 2+ coletas"}
                  </td>
                  <td>
                    {tendencia === "acelerando" && <span className="delta-up">🚀 acelerando</span>}
                    {tendencia === "desacelerando" && <span className="delta-down">🐌 desacelerando</span>}
                    {tendencia === "estável" && <span className="muted">estável</span>}
                    {!tendencia && <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted" style={{ padding: 12 }}>Nenhum concorrente ainda — adicione em <Link href="/setup">Configurações</Link>.</p>
        )}
      </div>
      <p className="muted" style={{ marginTop: 12 }}>Δ/semana usa o primeiro e o último snapshot de cada concorrente; a tendência compara o ritmo recente com o ritmo histórico.</p>
    </main>
  );
}
