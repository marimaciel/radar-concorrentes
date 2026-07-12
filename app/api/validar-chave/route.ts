import { NextRequest, NextResponse } from "next/server";

type Resp = { ok: boolean; detalhe: string };

async function comTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const result = await promise;
    clearTimeout(timer);
    return result;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// PostgREST sinaliza "tabela não existe" de formas diferentes por versão:
// Postgres cru ("relation ... does not exist") ou schema cache (PGRST205 /
// "Could not find the table ... in the schema cache"). Sem isto, um schema
// não-rodado cai no ramo genérico e mostra "URL não encontrada" por engano.
function tabelaFaltando(body: string): boolean {
  const b = body.toLowerCase();
  return (
    b.includes("relation") ||
    b.includes("does not exist") ||
    b.includes("schema cache") ||
    b.includes("could not find the table") ||
    b.includes("pgrst205")
  );
}

async function validarSupabase(url: string, serviceKey: string): Promise<Resp> {
  const endpoint = `${url}/rest/v1/concorrentes?select=id&limit=1`;
  try {
    const res = await comTimeout(
      fetch(endpoint, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      }),
      15_000,
    );
    if (res.ok) return { ok: true, detalhe: "Conexão e tabela OK ✔" };
    if (res.status === 401 || res.status === 403) return { ok: false, detalhe: "Chave service_role inválida ou sem permissão" };
    if (res.status === 404) {
      const body = await res.text();
      if (tabelaFaltando(body)) {
        return { ok: true, detalhe: "Chave OK, mas tabela não encontrada — rode o supabase/schema.sql no SQL Editor" };
      }
      return { ok: false, detalhe: "URL não encontrada — verifique o Project URL" };
    }
    const body = await res.text();
    if (tabelaFaltando(body)) {
      return { ok: true, detalhe: "Chave OK, mas tabela não encontrada — rode o supabase/schema.sql no SQL Editor" };
    }
    return { ok: false, detalhe: `Resposta inesperada: HTTP ${res.status}` };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return { ok: false, detalhe: "Timeout — URL inacessível (15s)" };
    return { ok: false, detalhe: `URL inacessível: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function validarAnyapi(chave: string): Promise<Resp> {
  try {
    const res = await comTimeout(
      fetch("https://api.getanyapi.com/v1/run/instagram.profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${chave}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
      15_000,
    );
    if (res.status === 401) return { ok: false, detalhe: "Chave AnyAPI inválida ou expirada" };
    if (res.status === 400) {
      const body = await res.text();
      if (body.includes("no charge") || body.includes("nocharge") || body.includes("input")) {
        return { ok: true, detalhe: "Chave AnyAPI válida ✔ (custo zero — input proposital inválido)" };
      }
    }
    // Qualquer outra resposta não-401 significa que a chave foi aceita
    if (res.ok || res.status === 400) return { ok: true, detalhe: "Chave AnyAPI válida ✔" };
    return { ok: false, detalhe: `Resposta inesperada: HTTP ${res.status}` };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return { ok: false, detalhe: "Timeout — API inacessível (15s)" };
    return { ok: false, detalhe: `Erro de rede: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function validarAnthropic(chave: string): Promise<Resp> {
  try {
    const res = await comTimeout(
      fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": chave,
          "anthropic-version": "2023-06-01",
        },
      }),
      15_000,
    );
    if (res.ok) return { ok: true, detalhe: "Chave Anthropic válida ✔" };
    if (res.status === 401) return { ok: false, detalhe: "Chave Anthropic inválida ou sem permissão" };
    return { ok: false, detalhe: `Resposta inesperada: HTTP ${res.status}` };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return { ok: false, detalhe: "Timeout — API inacessível (15s)" };
    return { ok: false, detalhe: `Erro de rede: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json();
  const { fonte } = body as { fonte: string };

  if (fonte === "supabase") {
    const { url, serviceKey } = body as { url: string; serviceKey: string };
    if (!url || !serviceKey) return NextResponse.json({ ok: false, detalhe: "URL e service_role key são obrigatórios" });
    return NextResponse.json(await validarSupabase(url.trim(), serviceKey.trim()));
  }

  if (fonte === "anyapi") {
    const { chave } = body as { chave: string };
    if (!chave) return NextResponse.json({ ok: false, detalhe: "Chave obrigatória" });
    return NextResponse.json(await validarAnyapi(chave.trim()));
  }

  if (fonte === "anthropic") {
    const { chave } = body as { chave: string };
    if (!chave) return NextResponse.json({ ok: false, detalhe: "Chave obrigatória" });
    return NextResponse.json(await validarAnthropic(chave.trim()));
  }

  return NextResponse.json({ ok: false, detalhe: "Fonte desconhecida" }, { status: 400 });
}
