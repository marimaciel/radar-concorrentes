// lib/analise.ts — Fase 6: Insights IA (/posicionamento)
// Coleta insumos do Supabase, chama Claude API, grava em `analises`.
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "./supabase";
import type { Concorrente, Snapshot, DadosColeta } from "./supabase";

// ---------------------------------------------------------------- tipos
export type Analise = {
  id: string;
  tipo: string;
  resultado: string;
  snapshot_ids: string[] | null;
  custo_tokens_in: number | null;
  custo_tokens_out: number | null;
  gerado_em: string;
};

// ---------------------------------------------------------------- prompt
const PROMPT_POSICIONAMENTO = `Você é uma analista de posicionamento estratégico especializada em criadores de conteúdo digital no Brasil.

A usuária quer entender o território dos seus concorrentes para encontrar onde ela pode se destacar.

Você vai receber bio, site, legendas de posts e anúncios de cada concorrente.

Retorne um relatório em markdown com estas 4 seções obrigatórias:

## 🗺️ Mapa de promessas

Para cada concorrente, liste o que ele promete — usando as PALAVRAS EXATAS que apareceram nas legendas, bio ou anúncios. Cite a fonte entre parênteses (ex: "aprenda em 7 dias" — bio).

## 🔴 Território saturado

Promessas ou ângulos que aparecem em 2 ou mais concorrentes. Liste com quem usa cada um.

## 🟢 Espaço em branco

Ângulos que nenhum concorrente ocupa — baseados no que falta, não no que existe. Seja específica: o que poderia ser dito que ninguém diz?

## 🧭 Recomendação de posição

Onde a usuária deveria se posicionar, com justificativa baseada nos dados. Tom direto, linguagem de aluna, sem jargão de marketing. Uma recomendação clara, não uma lista de opções.`;

// ---------------------------------------------------------------- insumos
function truncar(s: string | undefined | null, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "…" : s;
}

async function coletarInsumos(): Promise<string> {
  const sb = supabaseServer();

  // Busca todos os concorrentes
  const { data: concorrentes } = await sb
    .from("concorrentes")
    .select("*")
    .order("criado_em");

  if (!concorrentes?.length) {
    throw new Error("Nenhum concorrente cadastrado. Adicione concorrentes em Configurações antes de gerar a análise.");
  }

  // Para cada concorrente, pega o snapshot mais recente
  const { data: snapshots } = await sb
    .from("snapshots")
    .select("*")
    .order("coletado_em", { ascending: false });

  if (!snapshots?.length) {
    throw new Error("Nenhum snapshot encontrado. Execute uma coleta antes de gerar a análise.");
  }

  // Snapshot mais recente por concorrente
  const ultimoPorConc = new Map<string, Snapshot>();
  for (const sn of snapshots as Snapshot[]) {
    if (!ultimoPorConc.has(sn.concorrente_id)) {
      ultimoPorConc.set(sn.concorrente_id, sn);
    }
  }

  // Busca transcrições da tabela conteudos (opcional — ignora se tabela não existir)
  let transcriptsPorConc = new Map<string, string[]>();
  try {
    const { data: conteudos } = await sb
      .from("conteudos")
      .select("concorrente_id, transcript, titulo_ou_legenda")
      .not("transcript", "is", null)
      .order("buscado_em", { ascending: false });

    if (conteudos) {
      for (const c of conteudos) {
        if (!c.transcript) continue;
        const lista = transcriptsPorConc.get(c.concorrente_id) ?? [];
        if (lista.length < 3) {
          lista.push(truncar(c.transcript, 2000));
          transcriptsPorConc.set(c.concorrente_id, lista);
        }
      }
    }
  } catch {
    // tabela conteudos não existe ainda — ignora silenciosamente
  }

  // Monta o texto de insumos
  const partes: string[] = [];

  for (const conc of concorrentes as Concorrente[]) {
    const sn = ultimoPorConc.get(conc.id);
    if (!sn) continue;

    const d = sn.dados as DadosColeta;
    const linhas: string[] = [`## Concorrente: ${conc.nome}`];

    // Bio / perfil
    if (d.perfil?.bio) {
      linhas.push(`**Bio:** ${d.perfil.bio}`);
    }

    // Site
    if (d.site?.markdown) {
      linhas.push(`**Site (${d.site.url}):**\n${truncar(d.site.markdown, 4000)}`);
    }

    // Top 5 posts — legendas
    if (d.posts?.length) {
      const top5 = [...d.posts]
        .sort((a, b) => (b.likes + b.comentarios) - (a.likes + a.comentarios))
        .slice(0, 5);
      const legendas = top5
        .filter((p) => p.legenda)
        .map((p) => `- "${truncar(p.legenda, 300)}"`)
        .join("\n");
      if (legendas) linhas.push(`**Top posts (legendas):**\n${legendas}`);
    }

    // Ads
    if (d.ads?.length) {
      const textos = d.ads
        .filter((a) => a.texto)
        .map((a) => `- "${truncar(a.texto, 300)}"`)
        .join("\n");
      if (textos) linhas.push(`**Anúncios ativos:**\n${textos}`);
    }

    // Transcrições (da tabela conteudos)
    const transcripts = transcriptsPorConc.get(conc.id);
    if (transcripts?.length) {
      linhas.push(`**Transcrições:**\n${transcripts.map((t) => `- ${t}`).join("\n")}`);
    }

    linhas.push(`*Coleta: ${new Date(sn.coletado_em).toLocaleDateString("pt-BR")}*`);
    partes.push(linhas.join("\n\n"));
  }

  if (!partes.length) {
    throw new Error("Concorrentes cadastrados mas nenhum tem snapshots. Execute uma coleta primeiro.");
  }

  return partes.join("\n\n---\n\n");
}

// ---------------------------------------------------------------- geração
export async function gerarPosicionamento(): Promise<Analise> {
  const insumos = await coletarInsumos();

  const client = new Anthropic(); // lê ANTHROPIC_API_KEY do env

  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: PROMPT_POSICIONAMENTO,
    messages: [{ role: "user", content: insumos }],
  });

  const msg = await stream.finalMessage();

  if (msg.stop_reason === "refusal") {
    throw new Error("A IA recusou gerar a análise. Tente novamente ou revise os dados dos concorrentes.");
  }

  const resultado = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  if (!resultado) {
    throw new Error("A IA retornou uma resposta vazia. Tente novamente.");
  }

  // Coleta IDs dos snapshots usados
  const sb = supabaseServer();
  const { data: snapshots } = await sb
    .from("snapshots")
    .select("id, concorrente_id")
    .order("coletado_em", { ascending: false });

  const idsPorConc = new Map<string, string>();
  for (const sn of (snapshots ?? []) as Array<{ id: string; concorrente_id: string }>) {
    if (!idsPorConc.has(sn.concorrente_id)) {
      idsPorConc.set(sn.concorrente_id, sn.id);
    }
  }
  const snapshotIds = [...idsPorConc.values()];

  // Grava em analises
  const { data: analise, error } = await sb
    .from("analises")
    .insert({
      tipo: "posicionamento",
      resultado,
      snapshot_ids: snapshotIds.length ? snapshotIds : null,
      custo_tokens_in: msg.usage?.input_tokens ?? null,
      custo_tokens_out: msg.usage?.output_tokens ?? null,
    })
    .select()
    .single();

  if (error) {
    const detalhe = error.message || error.code || JSON.stringify(error);
    throw new Error(
      `Erro ao salvar análise: ${detalhe} — a tabela 'analises' existe? Rode o supabase/schema.sql no banco.`
    );
  }

  return analise as Analise;
}

// ---------------------------------------------------------------- busca
export async function buscarUltimaAnalise(tipo: string): Promise<Analise | null> {
  const sb = supabaseServer();
  const { data } = await sb
    .from("analises")
    .select("*")
    .eq("tipo", tipo)
    .order("gerado_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Analise | null) ?? null;
}
