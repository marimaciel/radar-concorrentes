// app/api/analise-hook/route.ts — Análise de hooks (/ideias)
import { NextResponse } from "next/server";
import { gerarHooks } from "@/lib/analise";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// POST — gera análise de hooks sob demanda para os vídeos com transcrição
export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "ANTHROPIC_API_KEY não configurada. Adicione a chave no .env.local para usar Análise de hooks." },
      { status: 503 }
    );
  }

  try {
    const resultado = await gerarHooks();
    return NextResponse.json({ ok: true, resultado });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
