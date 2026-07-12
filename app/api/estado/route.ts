import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  const chaves = {
    supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    anyapi: !!process.env.ANYAPI_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
  };
  let ultimaColeta: string | null = null;
  if (chaves.supabase) {
    const { data } = await supabaseServer()
      .from("snapshots")
      .select("coletado_em")
      .order("coletado_em", { ascending: false })
      .limit(1);
    ultimaColeta = data?.[0]?.coletado_em ?? null;
  }
  return NextResponse.json({ chaves, ultimaColeta });
}
