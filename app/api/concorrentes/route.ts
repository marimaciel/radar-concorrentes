import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb.from("concorrentes").select("*").order("criado_em");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const b = await req.json();
  if (!b?.nome?.trim()) return NextResponse.json({ erro: "Nome é obrigatório" }, { status: 400 });
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("concorrentes")
    .insert({
      nome: String(b.nome).trim().slice(0, 120),
      instagram: String(b.instagram || "").replace(/^@/, "").trim() || null,
      youtube: String(b.youtube || "").trim() || null,
      site: String(b.site || "").trim() || null,
      ads_query: String(b.ads_query || b.nome).trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ erro: "id obrigatório" }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from("concorrentes").delete().eq("id", id);
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
