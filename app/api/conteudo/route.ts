import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { garantirConteudo, type ItemConteudo } from "@/lib/conteudo";
import type { DadosColeta } from "@/lib/supabase";

// POST { concorrente_id, chave }
// Localiza o item (post IG ou vídeo YT) no último snapshot do concorrente
// e chama garantirConteudo para um único item.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { concorrente_id, chave } = body ?? {};

  if (!concorrente_id || !chave) {
    return NextResponse.json({ erro: "concorrente_id e chave são obrigatórios" }, { status: 400 });
  }

  const sb = supabaseServer();

  // Busca o último snapshot do concorrente
  const { data: snap, error: e1 } = await sb
    .from("snapshots")
    .select("dados")
    .eq("concorrente_id", concorrente_id)
    .order("coletado_em", { ascending: false })
    .limit(1)
    .single<{ dados: DadosColeta }>();

  if (e1 || !snap) {
    return NextResponse.json(
      { erro: "Snapshot não encontrado para o concorrente" },
      { status: 404 }
    );
  }

  const dados = snap.dados;
  let item: ItemConteudo | null = null;

  // Procura nos posts IG pelo code (shortcode)
  for (const post of dados.posts ?? []) {
    if (post.code === chave) {
      item = {
        fonte: "instagram",
        chave: post.code!,
        url: post.url ?? undefined,
        tituloOuLegenda: post.legenda ?? undefined,
        thumbUrl: post.thumb ?? undefined,
      };
      break;
    }
  }

  // Procura nos vídeos YT pelo id
  if (!item) {
    for (const video of dados.videos ?? []) {
      if (video.id === chave) {
        item = {
          fonte: "youtube",
          chave: video.id!,
          url: video.url ?? undefined,
          tituloOuLegenda: video.titulo ?? undefined,
        };
        break;
      }
    }
  }

  if (!item) {
    return NextResponse.json(
      { erro: `Item com chave "${chave}" não encontrado no último snapshot` },
      { status: 404 }
    );
  }

  const resultado = await garantirConteudo(concorrente_id, [item]);

  // Busca o transcript salvo para retornar ao cliente
  let transcript: string | null = null;
  if (resultado.inseridos > 0) {
    const { data: row } = await sb
      .from("conteudos")
      .select("transcript")
      .eq("concorrente_id", concorrente_id)
      .eq("chave", chave)
      .single<{ transcript: string | null }>();
    transcript = row?.transcript ?? null;
  }

  if (resultado.erros.length > 0 && resultado.inseridos === 0) {
    return NextResponse.json(
      { erro: resultado.erros[0]?.motivo ?? "falha ao processar item" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, transcript: transcript ?? undefined });
}
