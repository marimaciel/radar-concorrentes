import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer, type Concorrente, type Snapshot } from "@/lib/supabase";
import { CORES, filtrarPorPeriodo, fmt, normalizarPeriodo } from "@/lib/ui";
import { ResumoStrip } from "@/components/ResumoStrip";
import { CardConcorrente } from "@/components/CardConcorrente";
import { Barra } from "@/components/Barra";
import { SeletorPeriodo } from "@/components/SeletorPeriodo";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  // First-run: redireciona para o wizard se as chaves obrigatórias não estiverem configuradas
  const chavesOk =
    !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    !!process.env.ANYAPI_KEY;

  if (!chavesOk) {
    redirect("/setup/wizard");
  }

  const periodo = normalizarPeriodo((await searchParams).p);
  let concorrentes: Concorrente[] = [];
  let todos: Snapshot[] = [];
  let erroConfig: string | null = null;

  try {
    const sb = supabaseServer();
    const [c, s] = await Promise.all([
      sb.from("concorrentes").select("*").order("criado_em"),
      sb.from("snapshots").select("*").order("coletado_em", { ascending: false }).limit(300),
    ]);
    concorrentes = c.data ?? [];
    todos = (s.data as Snapshot[]) ?? [];
  } catch (e: unknown) {
    erroConfig = e instanceof Error ? e.message : String(e);
  }

  if (erroConfig) {
    return (
      <main>
        <div className="painel"><p className="erro">{erroConfig}</p><p className="muted">Siga o SETUP.md e recarregue.</p></div>
      </main>
    );
  }

  const snapshots = filtrarPorPeriodo(todos, periodo);
  const porConcorrente = concorrentes.map((c) => {
    const hist = snapshots.filter((s) => s.concorrente_id === c.id);
    return { c, atual: hist[0] ?? null, anterior: hist[1] ?? null, hist };
  });
  const comDados = porConcorrente.filter((x) => x.atual);
  const maxSeg = Math.max(...comDados.map((x) => x.atual!.seguidores || 0), 1);
  const maxEng = Math.max(...comDados.map((x) => x.atual!.eng_medio || 0), 1);
  const ultima = todos[0]?.coletado_em ?? null;

  return (
    <main>
      <ResumoStrip concorrentes={concorrentes.length} coletas={todos.length} ultima={ultima} />

      {!concorrentes.length && (
        <div className="painel" style={{ marginTop: 24 }}>
          <p>Nenhum concorrente cadastrado ainda.</p>
          <p className="muted" style={{ marginTop: 6 }}>Vá em <Link href="/setup">Configurações</Link>, adicione 2-3 perfis públicos do seu nicho e dispare a primeira coleta.</p>
        </div>
      )}

      {comDados.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <h2>Comparativo direto</h2>
            <SeletorPeriodo base="/" atual={periodo} />
          </div>
          <div className="painel duas-colunas" style={{ padding: 32 }}>
            <div>
              <h3 className="sub">Seguidores no Instagram</h3>
              {comDados.map((x, i) => (
                <Barra key={x.c.id} rotulo={x.c.nome} valor={x.atual!.seguidores || 0} max={maxSeg} cor={CORES[i % CORES.length]} />
              ))}
            </div>
            <div>
              <h3 className="sub">Engajamento médio por post</h3>
              {comDados.map((x, i) => (
                <Barra key={x.c.id} rotulo={x.c.nome} valor={x.atual!.eng_medio || 0} max={maxEng} cor={CORES[i % CORES.length]} texto={fmt.format(x.atual!.eng_medio || 0)} />
              ))}
            </div>
          </div>
        </>
      )}

      {concorrentes.length > 0 && (
        <>
          <h2>Radares ativos</h2>
          <div className="grid">
            {porConcorrente.map(({ c, atual, anterior, hist }, i) => (
              <CardConcorrente key={c.id} c={c} atual={atual} anterior={anterior} hist={hist} cor={CORES[i % CORES.length]} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
