import Link from "next/link";
import { supabaseServer, type Concorrente, type Snapshot } from "@/lib/supabase";
import { fmt, tempoRelativo } from "@/lib/ui";
import { buscarAnaliseHooks, HOOK_STYLE_LABELS, type HookSection, type HookStyle } from "@/lib/analise";
import { GerarAnaliseHook } from "@/components/GerarAnaliseHook";

export const dynamic = "force-dynamic";

// Barras de outlier por plataforma — normalizam pra um "destaque" comparável
const BARRA_YT = 5;      // views / inscritos
const BARRA_IG = 0.08;   // (likes + comentários) / seguidores — ~8% já é excelente no Instagram

type Fonte = "youtube" | "instagram";

type Candidato = {
  fonte: Fonte;
  chave: string | null;
  titulo: string;
  url: string | null;
  concorrente: Concorrente;
  data: string | null;
  coletado_em: string;
  audiencia: number;
  metricaPrincipal: number; // views (YT) ou engajamento likes+comentários (IG)
  viewsExtra?: number | null; // views do post IG, quando disponível
  ratio: number;
  destaque: number;
  outlier: boolean;
  transcript: string | null;
};

async function buscarTranscript(
  sb: ReturnType<typeof supabaseServer>,
  fonte: Fonte,
  chave: string
): Promise<string | null> {
  try {
    const { data } = await sb
      .from("conteudos")
      .select("transcript")
      .eq("fonte", fonte)
      .eq("chave", chave)
      .maybeSingle();
    return (data as { transcript?: string | null } | null)?.transcript ?? null;
  } catch {
    return null;
  }
}

function formatarDestaque(c: Candidato): string {
  if (c.fonte === "youtube") {
    return c.ratio >= 10 ? `${Math.round(c.ratio)}×` : `${c.ratio.toFixed(1)}×`;
  }
  const pct = c.ratio * 100;
  return pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
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

  // Coleta candidatos de AMBAS plataformas, do último snapshot de cada concorrente
  const candidatosSemTranscript: Omit<Candidato, "transcript">[] = [];

  for (const conc of concorrentes) {
    const snap = ultimoPorConcorrente.get(conc.id);
    if (!snap) continue;

    // YouTube
    const inscritos = snap.dados?.canal?.inscritos;
    if (inscritos && inscritos > 0 && snap.dados?.videos?.length) {
      for (const video of snap.dados.videos) {
        if (video.views == null || video.views <= 0) continue;
        const ratio = video.views / inscritos;
        const destaque = ratio / BARRA_YT;
        candidatosSemTranscript.push({
          fonte: "youtube",
          chave: video.id ?? null,
          titulo: video.titulo || "Sem título",
          url: video.url,
          concorrente: conc,
          data: video.data,
          coletado_em: snap.coletado_em,
          audiencia: inscritos,
          metricaPrincipal: video.views,
          ratio,
          destaque,
          outlier: destaque >= 1,
        });
      }
    }

    // Instagram
    const seguidores = snap.dados?.perfil?.seguidores;
    if (seguidores && seguidores > 0 && snap.dados?.posts?.length) {
      for (const post of snap.dados.posts) {
        const engajamento = (post.likes || 0) + (post.comentarios || 0);
        const ratio = engajamento / seguidores;
        const destaque = ratio / BARRA_IG;
        const primeiraLinha = post.legenda?.split("\n")[0]?.trim();
        candidatosSemTranscript.push({
          fonte: "instagram",
          chave: post.code ?? null,
          titulo: primeiraLinha || "Post",
          url: post.url,
          concorrente: conc,
          data: post.data ?? null,
          coletado_em: snap.coletado_em,
          audiencia: seguidores,
          metricaPrincipal: engajamento,
          viewsExtra: post.views,
          ratio,
          destaque,
          outlier: destaque >= 1,
        });
      }
    }
  }

  // Rankeia por destaque desc (normaliza as duas plataformas na mesma escala) e pega o top 24
  candidatosSemTranscript.sort((a, b) => b.destaque - a.destaque);
  const top = candidatosSemTranscript.slice(0, 24);

  // Busca transcrições em paralelo
  const candidatos: Candidato[] = await Promise.all(
    top.map(async (cand) => ({
      ...cand,
      transcript: cand.chave ? await buscarTranscript(sb, cand.fonte, cand.chave) : null,
    }))
  );

  const hooksPorChave = await buscarAnaliseHooks();

  return (
    <main>
      <h1>💡 Ideias Outlier</h1>
      <p className="muted">
        O melhor da última janela de coleta, sempre — Instagram e YouTube juntos. Um item vira
        <strong> outlier</strong> quando cruza a barra da própria plataforma: {BARRA_YT}× mais views que
        inscritos no YouTube, ou engajamento acima de ~{Math.round(BARRA_IG * 100)}% dos seguidores no
        Instagram. Abaixo da barra ainda aparece — é o melhor disponível, só não bateu o recorde.
      </p>

      {candidatos.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <GerarAnaliseHook />
        </div>
      )}

      {candidatos.length === 0 ? (
        <div className="painel" style={{ marginTop: 24, padding: 24 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Nenhum conteúdo disponível ainda.</p>
          <p className="muted" style={{ marginBottom: 8 }}>
            Esta página varre o último snapshot de cada concorrente cadastrado, em busca de posts do
            Instagram e vídeos do YouTube. Para aparecer, o snapshot precisa ter dado de audiência
            (seguidores ou inscritos) e pelo menos um post ou vídeo coletado.
          </p>
          <p className="muted" style={{ marginBottom: 8 }}>
            Se ainda não apareceu nada, pode ser que:
          </p>
          <ul className="muted" style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Ainda não há concorrentes cadastrados, ou nenhum tem snapshot coletado.</li>
            <li>Os snapshots foram coletados antes da captura de seguidores/inscritos ser implementada — nesses casos não há como calcular o ratio.</li>
            <li>Os canais/perfis cadastrados ainda não têm posts ou vídeos na última coleta.</li>
          </ul>
          <p className="muted" style={{ marginTop: 8 }}>
            Adicione mais concorrentes em{" "}
            <Link href="/setup" style={{ color: "var(--berry)" }}>Configurações</Link>{" "}
            e aguarde a próxima coleta semanal.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          {candidatos.map((cand, i) => {
            const destaqueFmt = formatarDestaque(cand);
            const hook = cand.chave ? hooksPorChave.get(cand.chave) : undefined;
            const fonteLabel = cand.fonte === "youtube" ? "YouTube" : "Instagram";

            return (
              <div key={`${cand.concorrente.id}-${cand.fonte}-${i}`} className="painel" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: "inline-block",
                      background: "var(--surface-alt, #f9f4f5)",
                      color: "var(--berry)",
                      borderRadius: 999,
                      padding: "1px 8px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      marginBottom: 6,
                    }}>
                      {fonteLabel}
                    </span>
                    <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: 4, lineHeight: 1.4 }}>
                      {cand.url ? (
                        <a href={cand.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--berry)" }}>
                          {cand.titulo}
                        </a>
                      ) : (
                        cand.titulo
                      )}
                    </p>
                    <p className="muted" style={{ fontSize: "0.85rem" }}>
                      {cand.concorrente.nome}
                      {cand.data ? ` · ${tempoRelativo(cand.data)}` : ""}
                    </p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {cand.outlier ? (
                      <span style={{
                        background: "var(--berry)",
                        color: "#fff",
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                      }}>
                        ★ {destaqueFmt}
                      </span>
                    ) : (
                      <span style={{
                        background: "transparent",
                        color: "var(--muted-foreground, #888)",
                        border: "1px solid var(--muted-foreground, #ccc)",
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}>
                        ○ melhor da janela
                      </span>
                    )}
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
                  {cand.fonte === "youtube" ? (
                    <>
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        👁 <strong>{fmt.format(cand.metricaPrincipal)}</strong> views
                      </span>
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        👥 <strong>{fmt.format(cand.audiencia)}</strong> inscritos
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        ❤️ <strong>{fmt.format(cand.metricaPrincipal)}</strong> engajamento
                      </span>
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        👥 <strong>{fmt.format(cand.audiencia)}</strong> seguidores
                      </span>
                      {cand.viewsExtra != null && cand.viewsExtra > 0 && (
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          👁 <strong>{fmt.format(cand.viewsExtra)}</strong> views
                        </span>
                      )}
                    </>
                  )}
                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                    📅 coletado {tempoRelativo(cand.coletado_em)}
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
                  <strong>{cand.outlier ? "Por que é outlier:" : "Por que aparece:"}</strong>{" "}
                  {cand.outlier ? (
                    cand.fonte === "youtube" ? (
                      <>
                        Este vídeo tem <strong>{destaqueFmt}</strong> mais views do que o canal tem inscritos — o
                        algoritmo empurrou pra fora da bolha e entregou pra quem ainda não seguia o criador. Isso é
                        sinal de tema validado pelo público, não pelo tamanho do canal. Vale estudar o gancho, o
                        formato e o título antes de criar algo parecido.
                      </>
                    ) : (
                      <>
                        Este post teve engajamento de <strong>{destaqueFmt}</strong> dos seguidores — bem acima da
                        norma de ~{Math.round(BARRA_IG * 100)}% que já configura um outlier no Instagram. É sinal de
                        que o tema ou o formato ressoou além do alcance normal do perfil.
                      </>
                    )
                  ) : (
                    <>
                      Ainda não cruzou a barra de outlier
                      {cand.fonte === "youtube" ? ` (${BARRA_YT}× inscritos)` : ` (~${Math.round(BARRA_IG * 100)}% de engajamento)`},
                      mas é o melhor desempenho disponível nesta janela de coleta para este concorrente — vale
                      acompanhar se a próxima coleta confirma a tendência.
                    </>
                  )}
                </div>

                {cand.transcript && (
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
                      {cand.transcript}
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
        YouTube: ratio = views ÷ inscritos do canal. Instagram: ratio = (likes + comentários) ÷ seguidores.
        Destaque normaliza os dois pela barra de cada plataforma para poder ranquear juntos. Snapshots sem
        dado de audiência não entram no cálculo.
      </p>
    </main>
  );
}
