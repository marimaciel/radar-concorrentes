// Coleta as 4 fontes públicas de um concorrente — tudo via AnyAPI (getanyapi.com).
// Contratos validados ao vivo em 2026-07-05 (ver PLANO-V3.md, Fase 1).
import type { Concorrente, DadosColeta, Post, Video } from "./supabase";

const ANYAPI = "https://api.getanyapi.com/v1/run";

type RespostaAnyApi = { data: any; custoUsd: number };

// POST /v1/run/<slug> — resposta {output:{data}, costUsd}; 400 = input inválido (no charge), não re-tenta
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

function pegar(obj: any, ...caminhos: string[]) {
  for (const c of caminhos) {
    const v = c.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

// "3 weeks ago" → ISO aproximado (channel_videos só traz data relativa)
function dataRelativa(rel: unknown): string | null {
  const m = String(rel ?? "").match(/(\d+)\s*(second|minute|hour|day|week|month|year)/i);
  if (!m) return null;
  const ms: Record<string, number> = {
    second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6,
  };
  return new Date(Date.now() - Number(m[1]) * ms[m[2].toLowerCase()]).toISOString();
}

// ---------------------------------------------------------------- Instagram
function normalizarPost(item: any): Post {
  const url: string | null = pegar(item, "url");
  const createdAt = pegar(item, "createdAt");
  return {
    code: url?.match(/\/(?:p|reel|tv)\/([\w-]+)/)?.[1] ?? pegar(item, "shortcode", "code", "id"),
    url,
    tipo: "post", // user_posts não traz tipo de mídia; top 5 são enriquecidos depois
    legenda: String(pegar(item, "caption") ?? "").slice(0, 500),
    likes: Number(pegar(item, "likes")) || 0,
    comentarios: Number(pegar(item, "comments")) || 0,
    views: pegar(item, "views", "videoViewCount", "playCount"),
    data: createdAt ? new Date(Number(createdAt) * 1000).toISOString() : null,
    thumb: null,
  };
}

// Enriquece um post com instagram.post (US$ 0,0033): tipo de mídia, views e thumb.
// Bônus, nunca derruba a coleta — post segue como tipo "post" se falhar.
async function enriquecerPost(p: Post): Promise<number> {
  if (!p.url) return 0;
  try {
    const r = await anyapi("instagram.post", { url: p.url });
    const d = r.data ?? {};
    const mt = String(pegar(d, "type", "mediaType", "productType") ?? "").toLowerCase();
    if (mt.includes("carousel") || mt.includes("sidecar")) p.tipo = "carrossel";
    else if (mt.includes("video") || mt.includes("reel") || mt.includes("clip")) p.tipo = "video";
    else if (mt.includes("image") || mt.includes("photo") || mt.includes("graphimage")) p.tipo = "foto";
    p.views = pegar(d, "views", "videoViewCount", "playCount") ?? p.views;
    p.thumb = pegar(d, "thumbnailUrl", "displayUrl", "imageUrl", "coverUrl", "thumbnail");
    return r.custoUsd;
  } catch {
    return 0;
  }
}

async function coletarInstagram(handle: string) {
  const [perfilR, postsR] = await Promise.all([
    anyapi("instagram.profile", { handle }),
    anyapi("instagram.user_posts", { handle }),
  ]);
  const p = perfilR.data ?? {};
  const perfil = {
    username: handle,
    nomeCompleto: pegar(p, "displayName", "fullName"),
    seguidores: Number(pegar(p, "followers")) || 0,
    totalPosts: Number(pegar(p, "posts", "postsCount")) || 0,
    bio: String(pegar(p, "bio", "biography") ?? "").slice(0, 300),
    avatarUrl: pegar(p, "avatarUrl", "profilePicUrl"),
  };
  const d = postsR.data;
  const items: any[] = Array.isArray(d) ? d : d?.posts ?? d?.items ?? [];
  const posts = items.map(normalizarPost).filter((x) => x.code);

  let custo = perfilR.custoUsd + postsR.custoUsd;
  const top5 = [...posts]
    .sort((a, b) => b.likes + b.comentarios - (a.likes + a.comentarios))
    .slice(0, 5);
  custo += (await Promise.all(top5.map(enriquecerPost))).reduce((a, c) => a + c, 0);

  return { perfil, posts, custo };
}

// ---------------------------------------------------------------- YouTube
// Aceita URL com /@handle ou /channel/UC…
function refCanal(canalUrl: string): Record<string, string> {
  const id = canalUrl.match(/channel\/(UC[\w-]{22})/)?.[1];
  if (id) return { channelId: id };
  const handle = canalUrl.match(/@([\w.\-]+)/)?.[1];
  if (handle) return { handle: `@${handle}` };
  throw new Error("URL do canal precisa de @handle ou /channel/UC…");
}

async function coletarYoutube(canalUrl: string) {
  const ref = refCanal(canalUrl);
  const [canalR, videosR] = await Promise.all([
    anyapi("youtube.channel", ref),
    anyapi("youtube.channel_videos", ref),
  ]);
  const canal = {
    inscritos: pegar(canalR.data, "subscribers") != null ? Number(pegar(canalR.data, "subscribers")) : null,
    channelId: pegar(canalR.data, "channelId"),
  };
  const dv = videosR.data;
  const arr: any[] = Array.isArray(dv) ? dv : dv?.videos ?? dv?.items ?? [];
  const videos: Video[] = arr
    .slice(0, 10)
    .map((v) => ({
      titulo: String(pegar(v, "title") ?? ""),
      views: pegar(v, "views") != null ? Number(pegar(v, "views")) : null,
      data: dataRelativa(pegar(v, "publishedTime", "publishedTimeText")),
      url: pegar(v, "url") ?? (v.id ? `https://www.youtube.com/watch?v=${v.id}` : null),
      id: pegar(v, "id", "videoId"),
    }))
    .filter((v) => v.titulo);
  return { videos, canal, custo: canalR.custoUsd + videosR.custoUsd };
}

const desc = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// Fallback sem custo: feed RSS oficial do YouTube (últimos ~15 vídeos, com views)
async function coletarYoutubeRss(canalUrl: string) {
  let channelId = canalUrl.match(/channel\/(UC[\w-]{22})/)?.[1];
  if (!channelId) {
    const res = await fetch(canalUrl, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(30000) });
    const html = await res.text();
    channelId = html.match(/"channelId":"(UC[\w-]{22})"/)?.[1] ?? html.match(/channel_id=(UC[\w-]{22})/)?.[1];
  }
  if (!channelId) throw new Error("channelId não encontrado no canal");
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
  const xml = await res.text();
  const videos: Video[] = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => m[1])
    .slice(0, 10)
    .map((e) => ({
      titulo: desc(e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      views: Number(e.match(/views="(\d+)"/)?.[1]) || null,
      data: e.match(/<published>(.*?)<\/published>/)?.[1] ?? null,
      url: e.match(/<yt:videoId>(.*?)<\/yt:videoId>/)
        ? `https://www.youtube.com/watch?v=${e.match(/<yt:videoId>(.*?)<\/yt:videoId>/)![1]}`
        : null,
      id: e.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ?? null,
    }))
    .filter((v) => v.titulo);
  return videos;
}

// ---------------------------------------------------------------- Ads (Meta Ad Library)
async function coletarAds(query: string) {
  const r = await anyapi("facebook.company_ads?max_items=10", { companyName: query, status: "ACTIVE" });
  const ads: any[] = r.data?.ads ?? [];
  return {
    ads: ads.slice(0, 10).map((a) => ({
      pagina: a.pageName ?? a.page_name ?? query,
      texto: String(a.bodyText ?? a.body ?? a.text ?? a.creativeText ?? "").slice(0, 400),
      ativoDesde: a.startDate ? new Date(a.startDate * 1000).toISOString().slice(0, 10) : null,
      id: a.id ?? null,
      link: a.id ? `https://www.facebook.com/ads/library/?id=${a.id}` : null,
      plataformas: Array.isArray(a.platforms) ? a.platforms : null,
      formato: a.displayFormat ?? null,
      ativoAte: a.endDate ? new Date(a.endDate * 1000).toISOString().slice(0, 10) : null,
    })),
    custo: r.custoUsd,
  };
}

// ---------------------------------------------------------------- Site
async function coletarSite(url: string) {
  const r = await anyapi("web.scrape", { url });
  return {
    site: {
      url,
      titulo: pegar(r.data, "title"),
      markdown: String(pegar(r.data, "markdown") ?? "").slice(0, 8000),
    },
    custo: r.custoUsd,
  };
}

// ---------------------------------------------------------------- coleta completa
export async function coletarConcorrente(c: Concorrente): Promise<{ dados: DadosColeta; erros: Record<string, string> }> {
  const dados: DadosColeta = {};
  const erros: Record<string, string> = {};
  const avisos: Record<string, string> = {};
  let custoTotal = 0;

  const youtube = async (canalUrl: string) => {
    try {
      const r = await coletarYoutube(canalUrl);
      custoTotal += r.custo;
      dados.videos = r.videos;
      dados.canal = r.canal;
    } catch (e: any) {
      dados.videos = await coletarYoutubeRss(canalUrl); // se falhar também, propaga
      avisos.youtube = `AnyAPI indisponível (${String(e?.message || e).slice(0, 80)}) — usado fallback RSS oficial`;
    }
  };

  const fontes: [string, boolean, () => Promise<void>][] = [
    ["instagram", !!c.instagram, async () => {
      const r = await coletarInstagram(c.instagram!);
      custoTotal += r.custo;
      dados.perfil = r.perfil;
      dados.posts = r.posts;
    }],
    ["youtube", !!c.youtube, () => youtube(c.youtube!)],
    ["site", !!c.site, async () => {
      const r = await coletarSite(c.site!);
      custoTotal += r.custo;
      dados.site = r.site;
    }],
    ["ads", !!c.ads_query, async () => {
      const r = await coletarAds(c.ads_query!);
      custoTotal += r.custo;
      dados.ads = r.ads;
    }],
  ];

  await Promise.all(
    fontes
      .filter(([, ativo]) => ativo)
      .map(async ([nome, , fn]) => {
        try { await fn(); } catch (e: any) { erros[nome] = String(e?.message || e).slice(0, 300); }
      })
  );

  if (Object.keys(avisos).length) dados.avisos = avisos;
  dados.custo_usd = Math.round(custoTotal * 1e6) / 1e6;
  return { dados, erros };
}

// Traduz erros técnicos para linguagem humana (exibido no dashboard)
export function humanizarErro(msg: string): string {
  if (/insufficient|credit/i.test(msg)) return "créditos da AnyAPI esgotados — recarregue em getanyapi.com";
  if (/HTTP 401/.test(msg)) return "chave de API inválida — confira no .env";
  if (/HTTP 429/.test(msg)) return "limite de requisições atingido — tente mais tarde";
  if (/timeout|TimeoutError/i.test(msg)) return "a fonte demorou demais — tente de novo";
  if (/HTTP 400/.test(msg)) return "a fonte recusou a consulta — confira handle/URL do concorrente";
  return msg.slice(0, 120);
}

export function engajamentoMedio(posts: Post[] | undefined): number | null {
  if (!posts?.length) return null;
  return Math.round(posts.reduce((a, p) => a + p.likes + p.comentarios, 0) / posts.length);
}
