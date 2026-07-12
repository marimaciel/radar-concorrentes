import Link from "next/link";
import { supabaseServer, type Concorrente, type Snapshot, type Video } from "@/lib/supabase";
import { fmt, tempoRelativo } from "@/lib/ui";
import { buscarAnaliseHooks, HOOK_STYLE_LABELS, type HookSection, type HookStyle } from "@/lib/analise";
import { GerarAnaliseHook } from "@/components/GerarAnaliseHook";

export const dynamic = "force-dynamic";

const RATIO_MINIMO = 5;

type Ideia = {
  video: Video;
  concorrente: Concorrente;
  inscritos: number;
  ratio: number;
  coletado_em: string;
  transcript: string | null;
};

async function buscarTranscript(sb: ReturnType<typeof supabaseServer>, videoId: string): Promise<string | null> {
  try {
    const { data } = await sb
      .from("conteudos")
      .select("transcript")
      .eq("fonte", "youtube")
      .eq("chave", videoId)
      .maybeSingle();
    return (data as { transcript?: string | null } | null)?.transcript ?? null;
  } catch {
    return null;
  }
}

export default async function Ideias() {
  const sb = supabaseServer();

  const [{ data: c }, { data: s }] = await Promise.all([
    sb.from("concorrentes").select("*").order("criado_em"),
    sb
      .from("snapshots")
      .select("*")
      .order("coletado_em", { ascending: false }),
  ]);

  const concorrentes = (c as Concorrente[]) ?? [];
  const snapshots = (s as Snapshot[]) ?? [];

  // Último snapshot por concorrente
  const ultimoPorConcorrente = new Map<string, Snapshot>();
  for (const snap of snapshots) {
    if (!ultimoPorConcorrente.has(snap.concorrente_id)) {
      ultimoPorConcorrente.set(snap.concorrente_id, snap);
    }
  }

  // Coleta todas as ideias que passam no filtro ratio >= 5
  const candidatos: Omit<Ideia, "transcript">[] = [];
  for (const conc of concorrentes) {
    const snap = ultimoPorConcorrente.get(conc.id);
    if (!snap) continue;
    const inscritos = snap.dados?.canal?.inscritos;
    if (!inscritos || inscritos <= 0) continue;
    const videos = snap.dados?.videos;
    if (!videos?.length) continue;

    for (const video of videos) {
      if (video.views == null || video.views <= 0) continue;
      const ratio = video.views / inscritos;
      if (ratio < RATIO_MINIMO) continue;
      candidatos.push({
        video,
        concorrente: conc,
        inscritos,
        ratio,
        coletado_em: snap.coletado_em,
      });
    }
  }

  // Rankeia por ratio desc
  candidatos.sort((a, b) => b.ratio - a.ratio);

  // Busca transcrições em paralelo para os candidatos que têm videoId
  const ideias: Ideia[] = await Promise.all(
    candidatos.map(async (c) => ({
      ...c,
      transcript: c.video.id ? await buscarTranscript(sb, c.video.id) : null,
    }))
  );

  const hooksPorVideo = await buscarAnaliseHooks();

  return (
    <main>
      <h1>💡 Ideias Outlier</h1>
      <p className="muted">
        Vídeos que viralizaram acima do tamanho do canal — o algoritmo empurrou pra fora da bolha.
        Filtro: pelo menos {RATIO_MINIMO}× mais views que inscritos.
      </p>

      {ideias.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <GerarAnaliseHook />
        </div>
      )}

      {ideias.length === 0 ? (
        <div className="painel" style={{ marginTop: 24, padding: 24 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Nenhum vídeo passou no filtro ainda.</p>
          <p className="muted" style={{ marginBottom: 8 }}>
            O filtro só varre os canais cadastrados aqui no radar. Para aparecer, um vídeo precisa ter
            pelo menos {RATIO_MINIMO}× mais views que o total de inscritos do canal — o que indica que o
            algoritmo distribuiu o vídeo para além da base fiel do criador.
          </p>
          <p className="muted" style={{ marginBottom: 8 }}>
            Se ainda não apareceu nada, pode ser que:
          </p>
          <ul className="muted" style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Os snapshots foram coletados antes da captura de inscritos ser implementada — nesses casos o filtro não tem como calcular o ratio e ignora o snapshot.</li>
            <li>Os canais cadastrados ainda não têm vídeos com performance outlier nesta janela de coleta.</li>
            <li>A varredura do nicho inteiro (canais fora do seu radar) está fora de escopo por ter custo imprevisível de API.</li>
          </ul>
          <p className="muted" style={{ marginTop: 8 }}>
            Adicione mais concorrentes em{" "}
            <Link href="/setup" style={{ color: "var(--berry)" }}>Configurações</Link>{" "}
            e aguarde a próxima coleta semanal.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {ideias.map((ideia, i) => {
            const ratioFmt = ideia.ratio >= 10
              ? `${Math.round(ideia.ratio)}×`
              : `${ideia.ratio.toFixed(1)}×`;
            const hook = ideia.video.id ? hooksPorVideo.get(ideia.video.id) : undefined;
            return (
              <div key={`${ideia.concorrente.id}-${i}`} className="painel" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4, lineHeight: 1.4 }}>
                      {ideia.video.url ? (
                        <a href={ideia.video.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--berry)" }}>
                          {ideia.video.titulo || "Sem título"}
                        </a>
                      ) : (
                        ideia.video.titulo || "Sem título"
                      )}
                    </p>
                    <p className="muted" style={{ fontSize: "0.85rem" }}>
                      {ideia.concorrente.nome}
                      {ideia.video.data ? ` · ${tempoRelativo(ideia.video.data)}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span style={{
                      background: "var(--berry)",
                      color: "#fff",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                    }}>
                      {ratioFmt}
                    </span>
                    {hook && (
                      <span style={{
                        background: "var(--surface-alt, #f9f4f5)",
                        color: "var(--berry)",
                        border: "1px solid var(--berry)",
                        borderRadius: 999,
                        padding: "2px 10px",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                      }}>
                        🎣 {HOOK_STYLE_LABELS[hook.hookStyle as HookStyle] ?? hook.hookStyle}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    👁 <strong>{ideia.video.views != null ? fmt.format(ideia.video.views) : "—"}</strong> views
                  </span>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    👥 <strong>{fmt.format(ideia.inscritos)}</strong> inscritos
                  </span>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    📅 coletado {tempoRelativo(ideia.coletado_em)}
                  </span>
                </div>

                <div style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "var(--surface-alt, #f9f4f5)",
                  borderRadius: 8,
                  borderLeft: "3px solid var(--berry)",
                  fontSize: "0.9rem",
                  lineHeight: 1.6,
                }}>
                  <strong>Por que passou no filtro:</strong>{" "}
                  Este vídeo tem <strong>{ratioFmt}</strong> mais views do que o canal tem inscritos — o algoritmo
                  empurrou pra fora da bolha e entregou pra quem ainda não seguia o criador. Isso é sinal de tema
                  validado pelo público, não pelo tamanho do canal. Vale estudar o gancho, o formato e o título
                  antes de criar algo parecido.
                </div>

                {ideia.transcript && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", color: "var(--berry)", fontWeight: 600, fontSize: "0.9rem" }}>
                      ver transcrição
                    </summary>
                    <pre style={{
                      marginTop: 8,
                      padding: 12,
                      background: "var(--surface-alt, #f9f4f5)",
                      borderRadius: 8,
                      fontSize: "0.8rem",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 300,
                      overflowY: "auto",
                    }}>
                      {ideia.transcript}
                    </pre>
                  </details>
                )}

                {hook && (
                  <details style={{ marginTop: 12 }}>
                    <summary style={{ cursor: "pointer", color: "var(--berry)", fontWeight: 600, fontSize: "0.9rem" }}>
                      ver quebra do hook
                    </summary>
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                      {(hook.sections as HookSection[]).map((s, si) => (
                        <div
                          key={si}
                          style={{
                            padding: "10px 12px",
                            background: "var(--surface-alt, #f9f4f5)",
                            borderRadius: 8,
                            borderLeft: "3px solid var(--berry)",
                          }}
                        >
                          <p style={{ fontSize: "0.8rem", marginBottom: 4 }}>
                            <strong>{s.label}</strong>{" "}
                            <span className="muted">— {s.note}</span>
                          </p>
                          <p style={{ fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {s.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="muted" style={{ marginTop: 16, fontSize: "0.85rem" }}>
        Ratio = views ÷ inscritos do canal na data da coleta. Snapshots sem dado de inscritos (coletados antes da integração YouTube) não entram no cálculo.
      </p>
    </main>
  );
}
