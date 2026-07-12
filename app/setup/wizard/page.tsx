"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Concorrente } from "@/lib/supabase";

/* ---------- tipos ---------- */
type ChipStatus = "idle" | "testando" | "ok" | "erro";
type ChipState = { status: ChipStatus; detalhe: string };

const chipInicial: ChipState = { status: "idle", detalhe: "" };

/* ---------- helpers visuais ---------- */
function Chip({ state }: { state: ChipState }) {
  if (state.status === "idle") return null;
  if (state.status === "testando") return <span className="chip chip-aviso">Testando…</span>;
  const cls = state.status === "ok" ? "chip chip-ok" : "chip chip-erro";
  const icone = state.status === "ok" ? "✔" : "✘";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
      <span className={cls}>{icone} {state.detalhe}</span>
    </div>
  );
}

function Progresso({ passo, total }: { passo: number; total: number }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span className="rotulo">Passo {passo} de {total}</span>
        <span className="muted" style={{ fontSize: "0.75rem" }}>{Math.round((passo / total) * 100)}%</span>
      </div>
      <div style={{ background: "var(--border)", borderRadius: 99, height: 4 }}>
        <div
          style={{
            background: "var(--berry)",
            borderRadius: 99,
            height: 4,
            width: `${(passo / total) * 100}%`,
            transition: "width 300ms ease",
          }}
        />
      </div>
    </div>
  );
}

/* ---------- passo 1: Supabase ---------- */
function PassoSupabase({
  url, setUrl, serviceKey, setServiceKey, chip, onTestar, onAvancar,
}: {
  url: string; setUrl: (v: string) => void;
  serviceKey: string; setServiceKey: (v: string) => void;
  chip: ChipState; onTestar: () => void; onAvancar: () => void;
}) {
  return (
    <div>
      <h1>Banco de dados (Supabase)</h1>
      <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
        Guarda os concorrentes e snapshots. Cada coleta é salva — nada se perde.
      </p>

      <div className="painel" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ marginBottom: 8 }}>
          <b>Onde pegar:</b>{" "}
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">supabase.com</a>{" "}
          → seu projeto → <b>Project Settings → API</b>
        </p>
        <ol style={{ paddingLeft: 18, fontSize: "0.85rem", color: "var(--muted)" }}>
          <li><b>Project URL</b> → cole abaixo como URL</li>
          <li><b>service_role key</b> (seção "Project API keys") → cole como Service Key</li>
          <li>Rode o <code>supabase/schema.sql</code> no SQL Editor para criar as tabelas</li>
        </ol>
      </div>

      <label>URL do projeto</label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://xxxxxxxxxxx.supabase.co"
        autoComplete="off"
      />
      <label>Service Role Key (secret)</label>
      <input
        type="password"
        value={serviceKey}
        onChange={(e) => setServiceKey(e.target.value)}
        placeholder="eyJhbGci..."
        autoComplete="off"
      />

      <div className="chips" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="sec"
          onClick={onTestar}
          disabled={chip.status === "testando" || !url || !serviceKey}
        >
          {chip.status === "testando" ? "Testando…" : "Testar conexão"}
        </button>
        <Chip state={chip} />
      </div>

      <button
        type="button"
        onClick={onAvancar}
        disabled={chip.status !== "ok"}
      >
        Próximo →
      </button>
    </div>
  );
}

/* ---------- passo 2: AnyAPI ---------- */
function PassoAnyapi({
  chave, setChave, chip, onTestar, onAvancar, onVoltar,
}: {
  chave: string; setChave: (v: string) => void;
  chip: ChipState; onTestar: () => void; onAvancar: () => void; onVoltar: () => void;
}) {
  return (
    <div>
      <h1>API de coleta (AnyAPI)</h1>
      <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
        Coleta dados públicos: seguidores, engajamento, posts, anúncios.
      </p>

      <div className="painel" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ marginBottom: 8 }}>
          <b>Onde pegar:</b>{" "}
          <a href="https://getanyapi.com" target="_blank" rel="noopener noreferrer">getanyapi.com</a>{" "}
          → Dashboard → <b>API Keys</b>
        </p>
        <p className="muted">
          <b>Custo estimado:</b> ~US$&nbsp;0,014 por concorrente na 1ª coleta;
          5 concorrentes ≈ US$&nbsp;0,10/mês no cron semanal. Você paga só pelo uso.
        </p>
      </div>

      <label>AnyAPI Key</label>
      <input
        type="password"
        value={chave}
        onChange={(e) => setChave(e.target.value)}
        placeholder="ak_..."
        autoComplete="off"
      />

      <div className="chips" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="sec"
          onClick={onTestar}
          disabled={chip.status === "testando" || !chave}
        >
          {chip.status === "testando" ? "Testando…" : "Testar chave"}
        </button>
        <Chip state={chip} />
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="sec" onClick={onVoltar}>← Voltar</button>
        <button type="button" onClick={onAvancar} disabled={chip.status !== "ok"}>Próximo →</button>
      </div>
    </div>
  );
}

/* ---------- passo 3: Anthropic (opcional) ---------- */
function PassoAnthropic({
  chave, setChave, chip, onTestar, onAvancar, onPular, onVoltar,
}: {
  chave: string; setChave: (v: string) => void;
  chip: ChipState; onTestar: () => void; onAvancar: () => void; onPular: () => void; onVoltar: () => void;
}) {
  return (
    <div>
      <h1>Insights IA — opcional</h1>
      <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
        Gera resumos em linguagem natural a partir dos dados coletados. O app funciona sem essa chave.
      </p>

      <div className="painel" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ marginBottom: 8 }}>
          <b>Onde pegar:</b>{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>{" "}
          → <b>API Keys</b> → <b>Create Key</b>
        </p>
        <p className="muted">Deixe em branco e clique "Pular" se não quiser usar agora.</p>
      </div>

      <label>Anthropic API Key (opcional)</label>
      <input
        type="password"
        value={chave}
        onChange={(e) => setChave(e.target.value)}
        placeholder="sk-ant-..."
        autoComplete="off"
      />

      <div className="chips" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className="sec"
          onClick={onTestar}
          disabled={chip.status === "testando" || !chave}
        >
          {chip.status === "testando" ? "Testando…" : "Testar chave"}
        </button>
        <Chip state={chip} />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className="sec" onClick={onVoltar}>← Voltar</button>
        <button type="button" className="sec" onClick={onPular}>Pular</button>
        <button
          type="button"
          onClick={onAvancar}
          disabled={chip.status !== "ok"}
        >
          Próximo →
        </button>
      </div>
    </div>
  );
}

/* ---------- passo 4: final ---------- */
const VAZIO_CONCORRENTE = { nome: "", instagram: "", youtube: "", site: "", ads_query: "" };

function PassoFinal({
  url, serviceKey, anyapiKey, anthropicKey, onVoltar,
}: {
  url: string; serviceKey: string; anyapiKey: string; anthropicKey: string; onVoltar: () => void;
}) {
  const [jaConfigurado, setJaConfigurado] = useState<boolean | null>(null);
  const [concorrentes, setConcorrentes] = useState<Concorrente[]>([]);
  const [form, setForm] = useState({ ...VAZIO_CONCORRENTE });
  const [salvando, setSalvando] = useState(false);
  const [logColeta, setLogColeta] = useState<string[]>([]);
  const [coletando, setColetando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const router = useRouter();

  const linhasEnv = [
    `NEXT_PUBLIC_SUPABASE_URL=${url}`,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`,
    `ANYAPI_KEY=${anyapiKey}`,
    anthropicKey ? `ANTHROPIC_API_KEY=${anthropicKey}` : "",
  ].filter(Boolean).join("\n");

  useEffect(() => {
    fetch("/api/estado")
      .then((r) => r.json())
      .then((e) => {
        const ok = e.chaves?.supabase && e.chaves?.anyapi;
        setJaConfigurado(!!ok);
        if (ok) {
          fetch("/api/concorrentes")
            .then((r) => r.json())
            .then((c) => setConcorrentes(Array.isArray(c) ? c : []));
        }
      })
      .catch(() => setJaConfigurado(false));
  }, []);

  function copiar() {
    navigator.clipboard.writeText(linhasEnv).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  function baixar() {
    const blob = new Blob([linhasEnv], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = ".env.local";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function adicionarConcorrente(ev: React.FormEvent) {
    ev.preventDefault();
    setSalvando(true);
    const r = await fetch("/api/concorrentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    if (!r.ok) { alert((await r.json()).erro || "Erro ao salvar"); return; }
    setForm({ ...VAZIO_CONCORRENTE });
    const lista = await fetch("/api/concorrentes").then((res) => res.json());
    setConcorrentes(Array.isArray(lista) ? lista : []);
  }

  async function coletarConcorrente(c: Concorrente) {
    setColetando(true);
    setLogColeta((l) => [...l, `→ Coletando ${c.nome}…`]);
    try {
      const r = await fetch("/api/coletar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id }),
      });
      const j = await r.json();
      if (j.ok) {
        const resumo = Object.entries(j.fontes as Record<string, string>)
          .map(([f, s]) => `${f}: ${s === "ok" ? "✔" : s === "—" ? "pulado" : "✘"}`)
          .join("  ");
        setLogColeta((l) => [...l, `  ${c.nome} concluído — ${resumo}`]);
      } else {
        setLogColeta((l) => [...l, `  ${c.nome} ERRO: ${j.erro}`]);
      }
    } catch (e) {
      setLogColeta((l) => [...l, `  ERRO: ${String(e)}`]);
    }
    setColetando(false);
  }

  return (
    <div>
      <h1>Tudo pronto!</h1>
      <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
        Seu arquivo <code>.env.local</code> com todas as chaves está pronto.
      </p>

      <h2>Arquivo .env.local</h2>
      <div className="painel" style={{ marginBottom: 20 }}>
        <textarea
          readOnly
          value={linhasEnv}
          style={{
            width: "100%", minHeight: 120,
            background: "#2a2020", color: "#fff7ec",
            fontFamily: "ui-monospace, monospace", fontSize: "0.8rem",
            border: "none", borderRadius: "var(--radius)", padding: 14,
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" className="sec" onClick={copiar}>
            {copiado ? "Copiado ✔" : "Copiar"}
          </button>
          <button type="button" className="sec" onClick={baixar}>
            Baixar .env.local
          </button>
        </div>
      </div>

      <h2>Como usar</h2>
      <div className="painel" style={{ marginBottom: 20 }}>
        <p className="muted" style={{ marginBottom: 10 }}>
          <b>Rodando local:</b> salve o arquivo <code>.env.local</code> na raiz do projeto e
          reinicie <code>npm run dev</code>. O servidor precisa ser reiniciado para carregar as novas variáveis.
        </p>
        <p className="muted">
          <b>Vercel:</b> vá em <b>Settings → Environment Variables</b>, adicione cada linha
          acima como variável separada e faça um novo deploy.
        </p>
      </div>

      {jaConfigurado === null && (
        <p className="muted">Verificando servidor…</p>
      )}

      {jaConfigurado === false && (
        <div className="painel" style={{ borderLeft: "3px solid var(--gold)", marginBottom: 20 }}>
          <p className="muted">
            O servidor ainda não enxerga as chaves. Após salvar o <code>.env.local</code> e
            reiniciar <code>npm run dev</code> (ou fazer deploy na Vercel), volte aqui para
            cadastrar o primeiro concorrente e disparar a coleta.
          </p>
        </div>
      )}

      {jaConfigurado === true && (
        <>
          <h2>Primeiro concorrente</h2>
          <div className="painel" style={{ marginBottom: 20 }}>
            {concorrentes.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {concorrentes.map((c) => (
                  <div className="linha" key={c.id}>
                    <span><b>{c.nome}</b></span>
                    <button
                      type="button"
                      className="sec"
                      onClick={() => coletarConcorrente(c)}
                      disabled={coletando}
                    >
                      {coletando ? "Coletando…" : "▶ Coletar"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={adicionarConcorrente}>
              <label>Nome *</label>
              <input
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Maria Fulana"
                required
              />
              <label>Instagram (sem @)</label>
              <input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="mariafulana"
              />
              <label>Canal do YouTube (URL)</label>
              <input
                value={form.youtube}
                onChange={(e) => setForm({ ...form, youtube: e.target.value })}
                placeholder="https://www.youtube.com/@mariafulana"
              />
              <label>Site / página de vendas (URL)</label>
              <input
                value={form.site}
                onChange={(e) => setForm({ ...form, site: e.target.value })}
                placeholder="https://mariafulana.com.br"
              />
              <label>Nome da página no Facebook (para anúncios)</label>
              <input
                value={form.ads_query}
                onChange={(e) => setForm({ ...form, ads_query: e.target.value })}
                placeholder="deixe vazio para usar o nome"
              />
              <button type="submit" disabled={salvando}>
                {salvando ? "Salvando…" : "＋ Adicionar concorrente"}
              </button>
            </form>

            {logColeta.length > 0 && (
              <div className="log" style={{ marginTop: 14 }}>
                {logColeta.join("\n")}
              </div>
            )}
          </div>

          <Link href="/">
            <button type="button" style={{ marginBottom: 8 }}>Ir para o Dashboard →</button>
          </Link>
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <button type="button" className="sec" onClick={onVoltar}>← Voltar</button>
      </div>
    </div>
  );
}

/* ---------- orquestrador principal ---------- */
export default function Wizard() {
  const [passo, setPasso] = useState(1);
  const TOTAL = 4;

  // passo 1 — supabase
  const [sbUrl, setSbUrl] = useState("");
  const [sbKey, setSbKey] = useState("");
  const [chipSb, setChipSb] = useState<ChipState>(chipInicial);

  // passo 2 — anyapi
  const [aaKey, setAaKey] = useState("");
  const [chipAa, setChipAa] = useState<ChipState>(chipInicial);

  // passo 3 — anthropic
  const [anKey, setAnKey] = useState("");
  const [chipAn, setChipAn] = useState<ChipState>(chipInicial);

  async function testar(fonte: string, extra: Record<string, string>, set: (c: ChipState) => void) {
    set({ status: "testando", detalhe: "" });
    try {
      const r = await fetch("/api/validar-chave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fonte, ...extra }),
      });
      const j = await r.json() as { ok: boolean; detalhe: string };
      set({ status: j.ok ? "ok" : "erro", detalhe: j.detalhe });
    } catch (e) {
      set({ status: "erro", detalhe: `Erro de rede: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "40px 24px" }}>
      <Progresso passo={passo} total={TOTAL} />

      {passo === 1 && (
        <PassoSupabase
          url={sbUrl} setUrl={setSbUrl}
          serviceKey={sbKey} setServiceKey={setSbKey}
          chip={chipSb}
          onTestar={() => testar("supabase", { url: sbUrl, serviceKey: sbKey }, setChipSb)}
          onAvancar={() => setPasso(2)}
        />
      )}

      {passo === 2 && (
        <PassoAnyapi
          chave={aaKey} setChave={setAaKey}
          chip={chipAa}
          onTestar={() => testar("anyapi", { chave: aaKey }, setChipAa)}
          onAvancar={() => setPasso(3)}
          onVoltar={() => setPasso(1)}
        />
      )}

      {passo === 3 && (
        <PassoAnthropic
          chave={anKey} setChave={setAnKey}
          chip={chipAn}
          onTestar={() => testar("anthropic", { chave: anKey }, setChipAn)}
          onAvancar={() => setPasso(4)}
          onPular={() => setPasso(4)}
          onVoltar={() => setPasso(2)}
        />
      )}

      {passo === 4 && (
        <PassoFinal
          url={sbUrl}
          serviceKey={sbKey}
          anyapiKey={aaKey}
          anthropicKey={anKey}
          onVoltar={() => setPasso(3)}
        />
      )}
    </main>
  );
}
