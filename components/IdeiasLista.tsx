"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Fonte = "youtube" | "instagram";

type HookSection = { label: string; text: string; note: string };

export type CandidatoIdeia = {
  chave: string;
  fonte: Fonte;
  titulo: string;
  url: string | null;
  concorrenteId: string;
  concorrenteNome: string;
  dataRel: string | null;
  destaque: number;
  outlier: boolean;
  ratioLabel: string;
  metricaLinha: string;
  transcript: string | null;
  temTranscript: boolean;
  jaAnalisado: boolean;
  hook: { hookStyle: string; sections: HookSection[] } | null;
};

const HOOK_STYLE_LABELS: Record<string, string> = {
  "problem-promise": "Problema→Promessa",
  "contrarian-claim": "Contra-corrente",
  "list-tease": "Lista/Teaser",
  "demo-first": "Demonstração",
  "story-frame": "História",
  "data-shock": "Dado de choque",
  "identity-call": "Chamado de identidade",
  other: "Outro",
};

type FiltroPlataforma = "todos" | Fonte;

export function IdeiasLista({
  candidatos,
  concorrentes,
}: {
  candidatos: CandidatoIdeia[];
  concorrentes: Array<{ id: string; nome: string }>;
}) {
  const router = useRouter();

  const [filtroPlataforma, setFiltroPlataforma] = useState<FiltroPlataforma>("todos");
  const [filtroConcorrente, setFiltroConcorrente] = useState<string>("todos");
  const [soOutliers, setSoOutliers] = useState(false);
  const [soComTranscricao, setSoComTranscricao] = useState(false);
  const [esconderAnalisados, setEsconderAnalisados] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const visiveis = useMemo(() => {
    return candidatos.filter((c) => {
      if (filtroPlataforma !== "todos" && c.fonte !== filtroPlataforma) return false;
      if (filtroConcorrente !== "todos" && c.concorrenteId !== filtroConcorrente) return false;
      if (soOutliers && !c.outlier) return false;
      if (soComTranscricao && !c.temTranscript) return false;
      if (esconderAnalisados && c.jaAnalisado) return false;
      return true;
    });
  }, [candidatos, filtroPlataforma, filtroConcorrente, soOutliers, soComTranscricao, esconderAnalisados]);

  function alternarSelecao(chave: string) {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  }

  function selecionarTodosVisiveis() {
    setSelecionados((prev) => {
      const novo = new Set(prev);
      for (const c of visiveis) {
        if (c.temTranscript) novo.add(c.chave);
      }
      return novo;
    });
  }

  function limparSelecao() {
    setSelecionados(new Set());
  }

  async function analisarSelecionados() {
    if (selecionados.size === 0) return;
    setRodando(true);
    setErro(null);
    try {
      const r = await fetch("/api/analise-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chaves: [...selecionados] }),
      });
      const json = await r.json();
      if (!json.ok) {
        setErro(json.erro ?? "Erro desconhecido ao analisar hooks.");
      } else {
        limparSelecao();
        router.refresh();
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na conexão.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="painel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem" }}>
            <span className="muted">Plataforma</span>
            <select
              value={filtroPlataforma}
              onChange={(e) => setFiltroPlataforma(e.target.value as FiltroPlataforma)}
              style={{ padding: "4px 8px", borderRadius: 6 }}
            >
              <option value="todos">Todos</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem" }}>
            <span className="muted">Concorrente</span>
            <select
              value={filtroConcorrente}
              onChange={(e) => setFiltroConcorrente(e.target.value)}
              style={{ padding: "4px 8px", borderRadius: 6 }}
            >
              <option value="todos">Todos</option>
              {concorrentes.map((conc) => (
                <option key={conc.id} value={conc.id}>
                  {conc.nome}
                </option>
              ))}
            </select>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
            <input type="checkbox" checked={soOutliers} onChange={(e) => setSoOutliers(e.target.checked)} />
            só outliers ★
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={soComTranscricao}
              onChange={(e) => setSoComTranscricao(e.target.checked)}
            />
            só com transcrição
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
            <input
              type="checkbox"
              checked={esconderAnalisados}
              onChange={(e) => setEsconderAnalisados(e.target.checked)}
            />
            esconder já analisados
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn-berry" onClick={selecionarTodosVisiveis} style={{ fontSize: "0.8rem" }}>
            Selecionar todos (visíveis e analisáveis)
          </button>
          <button
            onClick={limparSelecao}
            style={{
              fontSize: "0.8rem",
              background: "transparent",
              border: "1px solid var(--muted-foreground, #ccc)",
              borderRadius: 8,
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            Limpar seleção
          </button>
          <button
            className="btn-berry"
            onClick={analisarSelecionados}
            disabled={rodando || selecionados.size === 0}
            style={{ fontSize: "0.8rem" }}
          >
            {rodando ? "analisando hooks…" : `🎣 Analisar selecionados (${selecionados.size})`}
          </button>
          <span className="muted" style={{ fontSize: "0.75rem" }}>
            Itens já analisados são pulados automaticamente pelo servidor — zero tokens gastos de novo.
          </span>
        </div>

        {erro && (
          <p style={{ color: "var(--berry)", fontSize: "0.8rem", maxWidth: 480 }}>⚠️ {erro}</p>
        )}
      </div>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {visiveis.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>
            Nenhum item corresponde aos filtros selecionados.
          </p>
        ) : (
          visiveis.map((cand) => {
            const fonteLabel = cand.fonte === "youtube" ? "YouTube" : "Instagram";
            const hook = cand.hook;

            return (
              <div key={cand.chave} className="painel" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, width: "100%" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flex: "1 1 0%", minWidth: 0 }}>
                    {cand.temTranscript && (
                      <input
                        type="checkbox"
                        checked={selecionados.has(cand.chave)}
                        onChange={() => alternarSelecao(cand.chave)}
                        style={{ marginTop: 6, flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
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
                        }}>
                          {fonteLabel}
                        </span>
                        {cand.jaAnalisado && (
                          <span style={{
                            display: "inline-block",
                            background: "transparent",
                            color: "var(--muted-foreground, #888)",
                            border: "1px solid var(--muted-foreground, #ccc)",
                            borderRadius: 999,
                            padding: "1px 8px",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                          }}>
                            já analisado
                          </span>
                        )}
                        {!cand.temTranscript && (
                          <span className="muted" style={{ fontSize: "0.7rem" }}>
                            sem transcrição
                          </span>
                        )}
                      </div>
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
                        {cand.concorrenteNome}
                        {cand.dataRel ? ` · ${cand.dataRel}` : ""}
                      </p>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flex: "0 0 auto", maxWidth: 170, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    {cand.outlier ? (
                      <span style={{
                        background: "var(--berry)",
                        color: "#fff",
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                      }}>
                        ★ {cand.ratioLabel}
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
                        🎣 {HOOK_STYLE_LABELS[hook.hookStyle] ?? hook.hookStyle}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>{cand.metricaLinha}</span>
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
                      {hook.sections.map((s, si) => (
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
          })
        )}
      </div>
    </div>
  );
}
