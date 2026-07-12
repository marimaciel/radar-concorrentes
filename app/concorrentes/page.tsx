import Link from "next/link";
import { supabaseServer, type Concorrente, type Snapshot } from "@/lib/supabase";
import { CORES, fmt, tempoRelativo } from "@/lib/ui";
import { Sparkline } from "@/components/Sparkline";

export const dynamic = "force-dynamic";

export default async function Concorrentes() {
  const sb = supabaseServer();
  const [{ data: c }, { data: s }] = await Promise.all([
    sb.from("concorrentes").select("*").order("criado_em"),
    sb.from("snapshots").select("*").order("coletado_em", { ascending: false }).limit(300),
  ]);
  const concorrentes = (c as Concorrente[]) ?? [];
  const snapshots = (s as Snapshot[]) ?? [];

  return (
    <main>
      <h1>👥 Competidores</h1>
      <p className="muted">Clique em um concorrente para ver a evolução temporal, o que mudou e todos os anúncios.</p>

      {!concorrentes.length && (
        <div className="painel" style={{ marginTop: 24 }}>
          <p className="muted">Nenhum concorrente ainda — adicione em <Link href="/setup">Configurações</Link>.</p>
        </div>
      )}

      <div className="painel" style={{ marginTop: 24, padding: "8px 24px" }}>
        {concorrentes.map((conc, i) => {
          const hist = snapshots.filter((sn) => sn.concorrente_id === conc.id);
          const atual = hist[0] ?? null;
          const seguidoresHist = [...hist].reverse().map((sn) => sn.seguidores).filter((v): v is number => v != null);
          return (
            <div className="linha" key={conc.id}>
              <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: CORES[i % CORES.length], flex: "none" }} aria-hidden />
                <span>
                  <Link href={`/concorrente/${conc.id}`} style={{ fontWeight: 700, color: "var(--berry)" }}>{conc.nome}</Link>{" "}
                  <span className="muted">
                    {conc.instagram ? `@${conc.instagram}` : ""} · {hist.length} coleta(s)
                    {atual ? ` · ${tempoRelativo(atual.coletado_em)}` : ""}
                  </span>
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {atual && <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt.format(atual.seguidores || 0)} seg.</span>}
                <Sparkline valores={seguidoresHist} cor={CORES[i % CORES.length]} />
              </span>
            </div>
          );
        })}
      </div>
    </main>
  );
}
