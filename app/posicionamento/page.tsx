// app/posicionamento/page.tsx — Fase 6 (server component)
import { GerarAnalise } from "@/components/GerarAnalise";
import { buscarUltimaAnalise } from "@/lib/analise";
import type { Analise } from "@/lib/analise";

export const dynamic = "force-dynamic";

// Renderizador de markdown simples — sem dependência externa
function renderMd(texto: string) {
  const linhas = texto.split("\n");
  const elementos: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linha.startsWith("## ")) {
      elementos.push(
        <h2 key={key++} style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 28, marginBottom: 8, color: "var(--text)" }}>
          {linha.slice(3)}
        </h2>
      );
    } else if (linha.startsWith("### ")) {
      elementos.push(
        <h3 key={key++} style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: 20, marginBottom: 6, color: "var(--text)" }}>
          {linha.slice(4)}
        </h3>
      );
    } else if (linha.startsWith("- ") || linha.startsWith("* ")) {
      const itens: string[] = [];
      while (i < linhas.length && (linhas[i].startsWith("- ") || linhas[i].startsWith("* "))) {
        itens.push(linhas[i].slice(2));
        i++;
      }
      elementos.push(
        <ul key={key++} style={{ paddingLeft: 20, marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {itens.map((item, j) => (
            <li key={j} style={{ fontSize: "0.9rem", lineHeight: 1.6 }}>{inlineMd(item)}</li>
          ))}
        </ul>
      );
      continue;
    } else if (linha === "---") {
      elementos.push(<hr key={key++} style={{ border: "none", borderTop: "1px solid var(--border)", margin: "24px 0" }} />);
    } else if (linha.trim()) {
      elementos.push(
        <p key={key++} style={{ fontSize: "0.9rem", lineHeight: 1.7, marginBottom: 8 }}>
          {inlineMd(linha)}
        </p>
      );
    }
    i++;
  }

  return <div>{elementos}</div>;
}

// inline: **negrito** e *itálico*
function inlineMd(texto: string): React.ReactNode {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return partes.map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**")) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    if (parte.startsWith("*") && parte.endsWith("*") && parte.length > 2) {
      return <em key={i}>{parte.slice(1, -1)}</em>;
    }
    return parte;
  });
}

export default async function Posicionamento() {
  const temChave = !!process.env.ANTHROPIC_API_KEY;

  let analise: Analise | null = null;
  if (temChave) {
    try {
      analise = await buscarUltimaAnalise("posicionamento");
    } catch {
      // ignora — pode ser tabela analises ainda não criada
    }
  }

  return (
    <main>
      <h1>🧭 Posicionamento</h1>
      <p className="muted" style={{ marginTop: 4, marginBottom: 24 }}>
        Análise do espaço em branco entre seus concorrentes — onde você pode se destacar.
      </p>

      {!temChave && (
        <div className="painel" style={{ padding: 24, maxWidth: 540 }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>Configure a chave para ativar os Insights IA</p>
          <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: "0.875rem", color: "var(--muted)" }}>
            <li>
              Crie sua chave gratuita em{" "}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--berry)", textDecoration: "underline" }}>
                console.anthropic.com
              </a>
            </li>
            <li>
              Adicione no seu <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>.env.local</code>:
              {" "}<code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4 }}>ANTHROPIC_API_KEY=sk-ant-…</code>
            </li>
          </ol>
        </div>
      )}

      {temChave && !analise && (
        <div className="painel" style={{ padding: 24, maxWidth: 540, marginBottom: 24 }}>
          <p className="muted" style={{ fontSize: "0.875rem", marginBottom: 16 }}>
            Nenhuma análise gerada ainda. Clique para analisar os dados dos seus concorrentes e descobrir onde você pode se posicionar.
          </p>
          <GerarAnalise />
        </div>
      )}

      {temChave && analise && (
        <>
          <div className="painel" style={{ padding: 28, marginBottom: 24 }}>
            {renderMd(analise.resultado)}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <GerarAnalise />
            <span className="muted" style={{ fontSize: "0.75rem" }}>
              Gerado em {new Date(analise.gerado_em).toLocaleString("pt-BR")}
              {analise.custo_tokens_in != null && (
                <> · {(analise.custo_tokens_in + (analise.custo_tokens_out ?? 0)).toLocaleString("pt-BR")} tokens</>
              )}
            </span>
          </div>
        </>
      )}
    </main>
  );
}
