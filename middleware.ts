import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function manterCookies(origem: NextResponse, destino: NextResponse) {
  for (const cookie of origem.cookies.getAll()) {
    destino.cookies.set(cookie.name, cookie.value, cookie);
  }
  return destino;
}

export async function middleware(request: NextRequest) {
  const caminho = request.nextUrl.pathname;

  // O cron usa autenticação própria por bearer token, não sessão de navegador.
  if (caminho === "/api/cron/coletar") return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const emailAutorizado = process.env.RADAR_ALLOWED_EMAIL?.trim().toLowerCase();
  const paginaLogin = caminho === "/login";

  if (!url || !chave || !emailAutorizado) {
    if (paginaLogin) return NextResponse.next();
    if (caminho.startsWith("/api/")) {
      return NextResponse.json({ erro: "Autenticação ainda não configurada" }, { status: 503 });
    }
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "?config=missing";
    return NextResponse.redirect(destino);
  }

  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies) {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const emailDoUsuario = user?.email?.trim().toLowerCase();

  if (user && emailDoUsuario !== emailAutorizado) {
    await supabase.auth.signOut();
    if (caminho.startsWith("/api/")) {
      return manterCookies(resposta, NextResponse.json({ erro: "E-mail sem autorização" }, { status: 403 }));
    }
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "?acesso=negado";
    return manterCookies(resposta, NextResponse.redirect(destino));
  }

  if (!user && !paginaLogin) {
    if (caminho.startsWith("/api/")) {
      return manterCookies(resposta, NextResponse.json({ erro: "Não autenticado" }, { status: 401 }));
    }
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = `?next=${encodeURIComponent(`${caminho}${request.nextUrl.search}`)}`;
    return manterCookies(resposta, NextResponse.redirect(destino));
  }

  if (user && paginaLogin) {
    const proximo = request.nextUrl.searchParams.get("next");
    const caminhoSeguro = proximo?.startsWith("/") && !proximo.startsWith("//") ? proximo : "/";
    return manterCookies(resposta, NextResponse.redirect(new URL(caminhoSeguro, request.url)));
  }

  return resposta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};