// app/api/analise-hook/route.ts — Análise de hooks (/ideias)
import { NextResponse } from "next/server";
import { gerarHooks } from "@/lib/analise";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST — gera análise de hooks sob demanda para os vídeos selecionados (ou todos, se nenhum vier)
export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, erro: "ANTHROPIC_API_KEY não configurada. Adicione a chave no .env.local para usar Análise de hooks." },
      { status: 503 }
    );
  }

  let chaves: string[] | undefined;
  try {
    const body = await req.json();
    if (Array.isArray(body?.chaves)) {
      chaves = body.chaves.filter((c: unknown): c is string => typeof c === "string");
    }
  } catch {
    // corpo vazio ou inválido — segue sem filtro (analisa tudo que faltar)
  }

  try {
    const resultado = await gerarHooks(chaves);
    const total = resultado.length;
    const analisados = chaves && chaves.length ? chaves.length : total;
    return NextResponse.json({ ok: true, analisados, total });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
