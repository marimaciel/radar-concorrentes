import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, type Concorrente, type DadosColeta } from "@/lib/supabase";
import { coletarConcorrente, engajamentoMedio } from "@/lib/coleta";
import { garantirConteudo, type ItemConteudo } from "@/lib/conteudo";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// GET — chamado pelo Vercel Cron (vercel.json). Itera todos os concorrentes
// e grava um snapshot de cada, igual ao disparo manual.
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return NextResponse.json({ erro: "CRON_SECRET não configurado" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb.from("concorrentes").select("*").order("criado_em");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  const resultados: Record<string, string> = {};
  for (const c of (data as Concorrente[]) ?? []) {
    try {
      const { dados, erros } = await coletarConcorrente(c);
      const { error: e2 } = await sb.from("snapshots").insert({
        concorrente_id: c.id,
        seguidores: dados.perfil?.seguidores ?? dados.canal?.inscritos ?? null,
        eng_medio: engajamentoMedio(dados.posts),
        dados,
        erros: Object.keys(erros).length ? erros : null,
      });
      if (e2) {
        resultados[c.nome] = `erro ao gravar: ${e2.message}`;
        continue;
      }

      // Pós-coleta: transcript + thumb (falha não derruba o cron)
      try {
        const itens = montarItensConteudo(dados);
        if (itens.length > 0) await garantirConteudo(c.id, itens);
        resultados[c.nome] = "ok";
      } catch (e: any) {
        resultados[c.nome] = `ok (conteudo warning: ${String(e?.message ?? e).slice(0, 80)})`;
      }
    } catch (e) {
      resultados[c.nome] = `erro: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({ ok: true, resultados });
}

// Top 5 posts IG por likes+comentarios (thumb de todos; transcript só para "video").
// + 1 vídeo YT com mais views.
function montarItensConteudo(dados: DadosColeta): ItemConteudo[] {
  const itens: ItemConteudo[] = [];

  const posts = dados.posts ?? [];
  const top5 = [...posts]
    .sort((a, b) => (b.likes + b.comentarios) - (a.likes + a.comentarios))
    .slice(0, 5);

  for (const post of top5) {
    if (!post.code) continue;
    itens.push({
      fonte: "instagram",
      chave: post.code,
      // transcript só para vídeo; sem url = não chama AnyAPI transcript
      url: post.tipo === "video" ? (post.url ?? undefined) : undefined,
      tituloOuLegenda: post.legenda ?? undefined,
      thumbUrl: post.thumb ?? undefined,
    });
  }

  const videos = dados.videos ?? [];
  const topVideo = [...videos]
    .filter((v) => v.id)
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];

  if (topVideo?.id) {
    itens.push({
      fonte: "youtube",
      chave: topVideo.id!,
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
