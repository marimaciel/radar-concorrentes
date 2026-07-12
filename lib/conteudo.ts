// Fase 2 — camada de conteúdo: transcript + thumb de posts IG e vídeos YT.
// Contratos AnyAPI validados ao vivo (ver PLANO-V3.md):
//   instagram.media_transcript: input {url} → data.transcripts[]{id,shortcode,text} — US$0,002
//   youtube.video_transcript:   input {url} → data.transcript (STRING JSON-encoded dos segmentos) — US$0,002
// 400 = input inválido, sem cobrança — não re-tenta.
// Retry 3x apenas em 429/5xx (igual ao helper anyapi de lib/coleta.ts).

import { supabaseServer } from "./supabase";

const ANYAPI = "https://api.getanyapi.com/v1/run";

type RespostaAnyApi = { data: any; custoUsd: number };

// Mesmo padrão de lib/coleta.ts — duplicado aqui pois anyapi não é exportado lá.
async function anyapi(slug: string, body: Record<string, unknown>): Promise<RespostaAnyApi> {
  const key = process.env.ANYAPI_KEY;
  if (!key) throw new Error("ANYAPI_KEY não configurada no .env");
  let erro: Error = new Error("falha");
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    const res = await fetch(`${ANYAPI}/${slug}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
    if (res.ok) {
      const r = await res.json();
      return { data: r.output?.data ?? {}, custoUsd: Number(r.costUsd) || 0 };
    }
    erro = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    if (![429, 500, 502, 503].includes(res.status)) break;
    await new Promise((s) => setTimeout(s, 3000 * tentativa));
  }
  throw erro;
}

// ---------------------------------------------------------------- Transcript

export type ResultadoTranscript = {
  transcript: string;
  segmentos: any[] | null;
  custoUsd: number;
};

// Busca transcript de um post IG ou vídeo YT via AnyAPI.
// IG: transcripts[].text concatenados; segmentos null.
// YT: data.transcript é STRING JSON-encoded de {text,startMs,endMs,startTimeText}[].
export async function buscarTranscript(
  fonte: "instagram" | "youtube",
  url: string
): Promise<ResultadoTranscript> {
  if (fonte === "instagram") {
    const r = await anyapi("instagram.media_transcript", { url });
    const items: any[] = r.data?.transcripts ?? [];
    const transcript = items.map((s: any) => String(s.text ?? "")).join(" ").trim();
    return { transcript, segmentos: null, custoUsd: r.custoUsd };
  }

  // YouTube — parse duplo: data.transcript é string JSON-encoded
  const r = await anyapi("youtube.video_transcript", { url });
  const raw = r.data?.transcript;
  let segmentos: any[] = [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    segmentos = Array.isArray(parsed) ? parsed : [];
  } catch {
    segmentos = [];
  }
  const transcript = segmentos.map((s: any) => String(s.text ?? "")).join(" ").trim();
  return { transcript, segmentos, custoUsd: r.custoUsd };
}

// Transcript de anúncio de vídeo da Meta Ad Library (facebook.ad_transcript, US$0,002).
// input {id} → data.{transcript, transcriptAvailable}. transcriptAvailable MENTE:
// vem true mesmo quando o provider devolve placeholder ("please provide the video…").
// Guarda descarta lixo → transcript null (mas a linha é gravada mesmo assim, evita re-pagar).
function transcriptEhLixo(t: string | null | undefined): boolean {
  return (
    !t ||
    t.length < 25 ||
    /please provide|i (cannot|can't|am unable)|no (audio|video|transcript)|unable to transcribe|provide the (video|audio)/i.test(t)
  );
}

export async function buscarTranscriptAd(adId: string): Promise<{ transcript: string | null; custoUsd: number }> {
  const r = await anyapi("facebook.ad_transcript", { id: adId });
  const bruto = r.data?.transcript;
  const t = typeof bruto === "string" ? bruto.trim() : "";
  return { transcript: transcriptEhLixo(t) ? null : t, custoUsd: r.custoUsd };
}

// ---------------------------------------------------------------- Thumb (Storage)

const BUCKET = "thumbs";

// Baixa thumb da URL e sobe para o bucket `thumbs` do Supabase Storage.
// Cria o bucket público na primeira necessidade (ignora erro "already exists").
// Retorna o path no bucket (<chave>.jpg).
export async function salvarThumb(url: string, chave: string): Promise<string> {
  const sb = supabaseServer();

  // Garantir que o bucket existe (primeira vez)
  await sb.storage.createBucket(BUCKET, { public: true }).catch(() => {
    // ignora erro "already exists"
  });

  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Thumb HTTP ${res.status}`);
  const buffer = await res.arrayBuffer();

  const path = `${chave}.jpg`;
  const { error } = await sb.storage.from(BUCKET).upload(path, buffer, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw new Error(`Storage upload: ${error.message}`);

  return path;
}

// ---------------------------------------------------------------- garantirConteudo

export type ItemConteudo = {
  fonte: "instagram" | "youtube" | "ads";
  chave: string;
  url?: string | null;
  tituloOuLegenda?: string | null;
  thumbUrl?: string | null;
};

export type ResultadoConteudo = {
  inseridos: number;
  erros: { chave: string; motivo: string }[];
};

// Dedup: só processa itens cujas chaves ainda não existem em `conteudos` para o concorrente.
// Para cada novo item: busca transcript (IG/YT quando url presente), salva thumb quando thumbUrl presente.
// Falha de item individual não derruba o lote.
export async function garantirConteudo(
  concorrenteId: string,
  itens: ItemConteudo[]
): Promise<ResultadoConteudo> {
  const sb = supabaseServer();

  // Busca chaves já existentes para este concorrente
  const { data: existentes } = await sb
    .from("conteudos")
    .select("chave, fonte")
    .eq("concorrente_id", concorrenteId);

  const jaExistem = new Set(
    (existentes ?? []).map((r: any) => `${r.fonte}:${r.chave}`)
  );

  const novos = itens.filter((i) => !jaExistem.has(`${i.fonte}:${i.chave}`));

  let inseridos = 0;
  const erros: { chave: string; motivo: string }[] = [];

  for (const item of novos) {
    try {
      let transcript: string | null = null;
      let transcript_segmentos: any[] | null = null;
      let custo_usd = 0;
      let thumb_path: string | null = null;

      // Transcript: apenas IG (tipo video) e YT quando há URL
      if ((item.fonte === "instagram" || item.fonte === "youtube") && item.url) {
        try {
          const res = await buscarTranscript(item.fonte, item.url);
          transcript = res.transcript || null;
          transcript_segmentos = res.segmentos;
          custo_usd += res.custoUsd;
        } catch (e: any) {
          // falha de transcript não derruba o item — segue sem transcript
        }
      }

      // Transcript de ad de vídeo (chave = ad id). Grava a linha sempre (mesmo null),
      // o dedup por (concorrente,fonte,chave) evita re-pagar o mesmo ad. Ad não tem thumb.
      if (item.fonte === "ads" && item.chave) {
        try {
          const res = await buscarTranscriptAd(item.chave);
          transcript = res.transcript;
          custo_usd += res.custoUsd;
        } catch (e: any) {
          // falha de transcript não derruba o item — grava linha sem transcript
        }
      }

      // Thumb: salva quando thumbUrl presente
      if (item.thumbUrl) {
        try {
          thumb_path = await salvarThumb(item.thumbUrl, item.chave);
        } catch (e: any) {
          // falha de thumb não derruba o item
        }
      }

      const { error } = await sb.from("conteudos").insert({
        concorrente_id: concorrenteId,
        fonte: item.fonte,
        chave: item.chave,
        url: item.url ?? null,
        titulo_ou_legenda: item.tituloOuLegenda ?? null,
        transcript,
        transcript_segmentos: transcript_segmentos ?? null,
        thumb_path,
        custo_usd: custo_usd || null,
      });

      if (error) {
        erros.push({ chave: item.chave, motivo: error.message });
      } else {
        inseridos++;
      }
    } catch (e: any) {
      erros.push({ chave: item.chave, motivo: String(e?.message ?? e).slice(0, 200) });
    }
  }

  return { inseridos, erros };
}
