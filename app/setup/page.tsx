"use client";
import { useEffect, useState } from "react";
import type { Concorrente } from "@/lib/supabase";

type Estado = { chaves: Record<string, boolean>; ultimaColeta: string | null };

const VAZIO = { nome: "", instagram: "", youtube: "", site: "", ads_query: "" };

export default function Setup() {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [lista, setLista] = useState<Concorrente[]>([]);
  const [form, setForm] = useState({ ...VAZIO });
  const [log, setLog] = useState<string[]>([]);
  const [coletando, setColetando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    const [e, c] = await Promise.all([
      fetch("/api/estado").then((r) => r.json()),
      fetch("/api/concorrentes").then((r) => r.json()),
    ]);
    setEstado(e);
    setLista(Array.isArray(c) ? c : []);
  }
  useEffect(() => { carregar(); }, []);

  async function adicionar(ev: React.FormEvent) {
    ev.preventDefault();
    setSalvando(true);
    const r = await fetch("/api/concorrentes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    if (!r.ok) { alert((await r.json()).erro || "Erro ao salvar"); return; }
    setForm({ ...VAZIO });
    carregar();
  }

  async function remover(c: Concorrente) {
    if (!confirm(`Remover "${c.nome}" e todo o histórico de coletas?`)) return;
    await fetch(`/api/concorrentes?id=${c.id}`, { method: "DELETE" });
    carregar();
  }

  async function coletarTodos() {
    setColetando(true);
    setLog([`Iniciando coleta de ${lista.length} concorrente(s)...`]);
    for (const c of lista) {
      setLog((l) => [...l, `→ ${c.nome}: coletando (pode levar 1-2 min)...`]);
      try {
        const r = await fetch("/api/coletar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: c.id }),
        });
        const j = await r.json();
        if (j.ok) {
          const resumo = Object.entries(j.fontes)
            .map(([f, s]) => `${f}: ${s === "ok" ? "✔" : s === "—" ? "pulado" : "✘"}`)
            .join("  ");
          setLog((l) => [...l, `  ${c.nome} concluído — ${resumo}`]);
        } else {
          setLog((l) => [...l, `  ${c.nome} ERRO: ${j.erro}`]);
        }
      } catch (e) {
        setLog((l) => [...l, `  ${c.nome} ERRO: ${String(e)}`]);
      }
    }
    setLog((l) => [...l, "Coleta finalizada. Veja o Dashboard 📡"]);
    setColetando(false);
    carregar();
  }

  const chaveBadge = (nome: string, ok: boolean | undefined) => (
    <span className="badge" key={nome}>
      {nome} {ok ? <span className="ok">✔</span> : <span className="erro">✘</span>}
    </span>
  );

  return (
    <main>
      <h1>⚙️ Configurações</h1>
      <p className="muted">Cadastre concorrentes e dispare coletas. Cada coleta vira um snapshot no banco — nada se perde.</p>

      <h2>Chaves de API</h2>
      <div className="painel">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {estado
            ? Object.entries(estado.chaves).map(([k, v]) => chaveBadge(k, v))
            : <span className="muted">carregando...</span>}
          <a
            href="/setup/wizard"
            style={{ fontSize: "0.8rem", color: "var(--berry)", marginLeft: 6 }}
          >
            refazer wizard →
          </a>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Chaves ficam no servidor: arquivo <code>.env.local</code> (rodando local) ou em
          Settings → Environment Variables (Vercel). Nunca aparecem no navegador.
          Faltando alguma? Veja o passo a passo no <code>SETUP.md</code>.
        </p>
      </div>

      <h2>Concorrentes ({lista.length})</h2>
      <div className="painel">
        {lista.map((c) => (
          <div className="linha" key={c.id}>
            <span>
              <b>{c.nome}</b>{" "}
              <span className="muted">
                {c.instagram ? `IG @${c.instagram}` : ""} {c.youtube ? "· YT" : ""} {c.site ? "· site" : ""} {c.ads_query ? "· ads" : ""}
              </span>
            </span>
            <button className="sec" onClick={() => remover(c)}>remover</button>
          </div>
        ))}
        {!lista.length && <p className="muted">Nenhum concorrente ainda — adicione o primeiro abaixo.</p>}

        <form onSubmit={adicionar} style={{ marginTop: 18 }}>
          <label>Nome *</label>
          <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Maria Fulana" required />
          <label>Instagram (sem @)</label>
          <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="mariafulana" />
          <label>Canal do YouTube (URL)</label>
          <input value={form.youtube} onChange={(e) => setForm({ ...form, youtube: e.target.value })} placeholder="https://www.youtube.com/@mariafulana" />
          <label>Site / página de vendas (URL)</label>
          <input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} placeholder="https://mariafulana.com.br" />
          <label>Nome da página no Facebook (para anúncios)</label>
          <input value={form.ads_query} onChange={(e) => setForm({ ...form, ads_query: e.target.value })} placeholder="deixe vazio para usar o nome" />
          <button disabled={salvando}>{salvando ? "Salvando..." : "＋ Adicionar concorrente"}</button>
        </form>
      </div>

      <h2>Coleta</h2>
      <div className="painel">
        <p className="muted" style={{ marginBottom: 12 }}>
          Última coleta: {estado?.ultimaColeta ? new Date(estado.ultimaColeta).toLocaleString("pt-BR") : "nunca"}
        </p>
        <button onClick={coletarTodos} disabled={coletando || !lista.length}>
          {coletando ? "Coletando..." : "▶ Coletar dados agora"}
        </button>
        {log.length > 0 && <div className="log">{log.join("\n")}</div>}
      </div>
    </main>
  );
}
