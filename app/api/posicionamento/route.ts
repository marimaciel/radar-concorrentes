// app/api/posicionamento/route.ts — Fase 6
import { NextResponse } from "next/server";
import { gerarPosicionamento, buscarUltimaAnalise } from "@/lib/analise";

// GET — retorna a análise mais recente (ou null)
export async function GET() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, analise: null, semChave: true });
  }

  try {
    const analise = await buscarUltimaAnalise("posicionamento");
    return NextResponse.json({ ok: true, analise });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}

// POST — gera nova análise sob demanda
export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, erro: "ANTHROPIC_API_KEY não configurada. Adicione a chave no .env.local para usar Insights IA." },
      { status: 503 }
    );
  }

  try {
    const analise = await gerarPosicionamento();
    return NextResponse.json({ ok: true, analise });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 500 });
  }
}
