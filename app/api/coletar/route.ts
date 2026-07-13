import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, type Concorrente, type DadosColeta } from "@/lib/supabase";
import { coletarConcorrente, engajamentoMedio } from "@/lib/coleta";
import { garantirConteudo, type ItemConteudo } from "@/lib/conteudo";

export const maxDuration = 300;

// POST { id } — coleta UM concorrente e grava snapshot (o setup chama um por vez)
export async function POST(req: NextRequest) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ erro: "id obrigatório" }, { status: 400 });

  const sb = supabaseServer();
  const { data: c, error } = await sb.from("concorrentes").select("*").eq("id", id).single<Concorrente>();
  if (error || !c) return NextResponse.json({ erro: "Concorrente não encontrado" }, { status: 404 });

  const { dados, erros } = await coletarConcorrente(c);

  const { error: e2 } = await sb.from("snapshots").insert({
    concorrente_id: c.id,
    // IG é a métrica primária; canal YouTube-only usa inscritos para ter
    // tendência e evolução temporal (senão seguidores fica null e some do gráfico).
    seguidores: dados.perfil?.seguidores ?? dados.canal?.inscritos ?? null,
    eng_medio: engajamentoMedio(dados.posts),
    dados,
    erros: Object.keys(erros).length ? erros : null,
  });
  if (e2) return NextResponse.json({ erro: e2.message }, { status: 500 });

  // Pós-coleta: enfileira conteúdo (transcript + thumb) em background.
  // Falha NUNCA derruba a coleta — aviso opcional no retorno.
  let warningConteudo: string | undefined;
  try {
    const itens = montarItensConteudo(dados);
    if (itens.length > 0) await garantirConteudo(c.id, itens);
  } catch (e: any) {
    warningConteudo = `conteudo: ${String(e?.message ?? e).slice(0, 120)}`;
  }

  return NextResponse.json({
    ok: true,
    nome: c.nome,
    fontes: {
      instagram: dados.perfil ? "ok" : erros.instagram || "—",
      youtube: dados.videos ? "ok" : erros.youtube || "—",
      site: dados.site ? "ok" : erros.site || "—",
      ads: dados.ads ? "ok" : erros.ads || "—",
    },
    ...(warningConteudo ? { warning: warningConteudo } : {}),
  });
}

// Top 5 posts IG por likes+comentarios (thumb de todos; transcript só para "video").
// + 1 vídeo YT com mais views.
function montarItensConteudo(dados: DadosColeta): ItemConteudo[] {
  const itens: ItemConteudo[] = [];

  const posts = dados.posts ?? [];
  const top5 = [...posts]
    .sort((a: any, b: any) => (b.likes + b.comentarios) - (a.likes + a.comentarios))
    .slice(0, 5);

  for (const post of top5) {
    if (!post.code) continue;
    itens.push({
      fonte: "instagram",
      chave: post.code,
      // transcript só para vídeo; para foto/carrossel/post entra sem URL (não chama AnyAPI)
      url: post.tipo === "video" ? (post.url ?? undefined) : undefined,
      tituloOuLegenda: post.legenda ?? undefined,
      thumbUrl: post.thumb ?? undefined,
    });
  }

  const videos = dados.videos ?? [];
  const topVideo = [...videos]
    .filter((v: any) => v.id)
    .sort((a: any, b: any) => (b.views ?? 0) - (a.views ?? 0))[0];

  if (topVideo?.id) {
    itens.push({
      fonte: "youtube",
      chave: topVideo.id,
      url: topVideo.url ?? undefined,
      tituloOuLegenda: topVideo.titulo ?? undefined,
    });
  }

  // Ads de vídeo: só VIDEO tem áudio (imagem/DPA/DCO → placeholder garantido, desperdício).
  for (const ad of dados.ads ?? []) {
    if (!ad.id || !/VIDEO/i.test(ad.formato ?? "")) continue;
    itens.push({
      fonte: "ads",
      chave: ad.id,
      url: ad.link ?? undefined,
      tituloOuLegenda: ad.texto ?? undefined,
    });
  }

  return itens;
}
