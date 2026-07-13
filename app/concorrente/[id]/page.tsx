import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer, type Concorrente, type Snapshot, type Post, type Conteudo } from "@/lib/supabase";
import { filtrarPorPeriodo, fmt, normalizarPeriodo, tempoRelativo } from "@/lib/ui";
import { GraficoLinha } from "@/components/GraficoLinha";
import { SeletorPeriodo } from "@/components/SeletorPeriodo";
import { Chips } from "@/components/Chips";
import { OQueMudou } from "@/components/OQueMudou";
import { BotaoBuscarTranscricao } from "@/components/BotaoBuscarTranscricao";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function thumbPublicUrl(thumbPath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/thumbs/${thumbPath}`;
}

function resolveThumb(chave: string | null, postThumb: string | null, conteudosMap: Map<string, Conteudo>): string | null {
  if (chave) {
    const c = conteudosMap.get(chave);
    if (c?.thumb_path) return thumbPublicUrl(c.thumb_path);
  }
  return postThumb ?? null;
}

function PostThumb({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div
        aria-hidden
        style={{
          width: "100%",
          aspectRatio: "1",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      style={{
        width: "100%",
        aspectRatio: "1",
        objectFit: "cover",
        borderRadius: 8,
        border: "1px solid var(--border)",
        display: "block",
      }}
    />
  );
}

export default async function ConcorrenteDetalhe({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { id } = await params;
  const periodo = normalizarPeriodo((await searchParams).p);

  const sb = supabaseServer();
  const [{ data: c }, { data: s }] = await Promise.all([
    sb.from("concorrentes").select("*").eq("id", id).single<Concorrente>(),
    sb.from("snapshots").select("*").eq("concorrente_id", id).order("coletado_em", { ascending: false }),
  ]);
  if (!c) notFound();

  // Busca conteudos (tabela pode não existir ainda — try/catch)
  let conteudosMap = new Map<string, Conteudo>();
  try {
    const { data: conteudos } = await sb
      .from("conteudos")
      .select("*")
      .eq("concorrente_id", id);
    for (const row of (conteudos as Conteudo[]) ?? []) {
      conteudosMap.set(row.chave, row);
    }
  } catch {
    // tabela conteudos ainda não criada — segue sem
  }

  const todos = (s as Snapshot[]) ?? [];
  const hist = filtrarPorPeriodo(todos, periodo);
  const atual = hist[0] ?? null;
  const anterior = hist[1] ?? null;

  const pontos = [...hist].reverse().map((sn) => ({
    t: Date.parse(sn.coletado_em),
    seg: sn.seguidores,
    eng: sn.eng_medio,
  }));

  const vistos = new Set<string>();
  const todosPosts: Post[] = [];
  for (const sn of hist) {
    for (const p of sn.dados.posts ?? []) {
      const chave = p.code ?? p.url ?? p.legenda;
      if (chave && !vistos.has(chave)) {
        vistos.add(chave);
        todosPosts.push(p);
      }
    }
  }
  const topPosts = todosPosts.sort((a, b) => b.likes - a.likes).slice(0, 10);
  const ads = atual?.dados.ads ?? [];
  const videos = atual?.dados.videos ?? [];

  return (
    <main>
      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--panel)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: "1.3rem", color: "var(--berry)", flex: "none" }} aria-hidden>
          {c.nome.trim().charAt(0).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <h1>{c.nome}</h1>
          <p className="muted">
            {c.instagram && <a href={`https://www.instagram.com/${c.instagram}/`} target="_blank">@{c.instagram}</a>}
            {c.youtube && <> · <a href={c.youtube} target="_blank">YouTube</a></>}
            {c.site && <> · <a href={c.site} target="_blank">site</a></>}
            {" · "}{todos.length} coleta(s){atual ? ` · última ${tempoRelativo(atual.coletado_em)}` : ""}
          </p>
        </div>
        <SeletorPeriodo base={`/concorrente/${c.id}`} atual={periodo} />
      </div>

      {!todos.length && (
        <div className="painel" style={{ marginTop: 24 }}>
          <p className="muted">Nenhuma coleta ainda — dispare no botão <b>Coletar agora</b>.</p>
        </div>
      )}

      {hist.length > 0 && (
        <>
          {atual && (
            <div className="resumo">
              <div><span className="rotulo">Seguidores</span><b>{fmt.format(atual.seguidores || 0)}</b></div>
              <div><span className="rotulo">Engaj. médio/post</span><b>{fmt.format(atual.eng_medio || 0)}</b></div>
              <div><span className="rotulo">Snapshots no período</span><b>{hist.length}</b></div>
            </div>
          )}

          <h2>Evolução temporal</h2>
          <div className="painel">
            <GraficoLinha pontos={pontos} />
          </div>

          <OQueMudou atual={atual} anterior={anterior} />

          {atual && (
            <>
              <h2>Fontes na última coleta</h2>
              <div className="painel"><Chips c={c} snap={atual} /></div>
            </>
          )}

          {topPosts.length > 0 && (
            <>
              <h2>Histórico de top posts</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
                  gap: 16,
                  marginTop: 0,
                }}
              >
                {topPosts.map((p, i) => {
                  const src = resolveThumb(p.code ?? null, p.thumb ?? null, conteudosMap);
                  const conteudo = p.code ? conteudosMap.get(p.code) : null;
                  const temTranscript = !!conteudo?.transcript;
                  const podeTranscricao = (p.tipo === "video" || p.tipo === "carrossel") && !temTranscript && !!p.url;

                  return (
                    <div
                      key={p.code ?? i}
                      className="painel"
                      style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}
                    >
                      <a href={p.url ?? "#"} target="_blank" style={{ display: "block" }}>
                        <PostThumb src={src} alt={(p.legenda || "(sem legenda)").slice(0, 60)} />
                      </a>
                      <p style={{ fontSize: "0.75rem", color: "var(--text)", lineHeight: 1.4, flex: 1, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                        {(p.legenda || "(sem legenda)").slice(0, 100)}
                      </p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="muted" style={{ fontSize: "0.7rem" }}>{fmt.format(p.likes)} ♥ · {fmt.format(p.comentarios)} 💬</span>
                        <span className="badge" style={{ fontSize: "0.65rem", padding: "2px 7px" }}>{p.tipo}</span>
                        {temTranscript && (
                          <span className="chip chip-ok" style={{ fontSize: "0.65rem", padding: "2px 7px" }}>transcrito</span>
                        )}
                      </div>
                      {temTranscript && conteudo?.transcript && (
                        <details style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--berry)", userSelect: "none" }}>ver transcrição</summary>
                          <p style={{ marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>{conteudo.transcript}</p>
                          <a
                            href={`data:text/plain;charset=utf-8,${encodeURIComponent(conteudo.transcript)}`}
                            download={`transcricao-${conteudo.chave}.txt`}
                            style={{ display: "inline-block", marginTop: 6, fontSize: "0.72rem", color: "var(--berry)", fontWeight: 700 }}
                          >
                            baixar .txt
                          </a>
                        </details>
                      )}
                      {podeTranscricao && p.code && (
                        <BotaoBuscarTranscricao concorrenteId={id} chave={p.code} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {videos.length > 0 && (
            <>
              <h2>Vídeos YouTube</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 16,
                  marginTop: 0,
                }}
              >
                {videos.slice(0, 9).map((v, i) => {
                  const conteudo = v.id ? conteudosMap.get(v.id) : null;
                  const temTranscript = !!conteudo?.transcript;
                  const ytThumb = v.id ? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` : null;
                  const src = conteudo?.thumb_path ? thumbPublicUrl(conteudo.thumb_path) : ytThumb;
                  const podeTranscricao = !temTranscript && !!v.url && !!v.id;

                  return (
                    <div
                      key={v.id ?? i}
                      className="painel"
                      style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}
                    >
                      <a href={v.url ?? "#"} target="_blank" style={{ display: "block" }}>
                        {src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={src}
                            alt={v.titulo}
                            loading="lazy"
                            style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: "100%", aspectRatio: "16/9", background: "var(--bg)", borderRadius: 6, border: "1px solid var(--border)" }} />
                        )}
                      </a>
                      <p style={{ fontSize: "0.8rem", fontWeight: 600, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {v.titulo}
                      </p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        <span className="muted" style={{ fontSize: "0.7rem" }}>
                          {v.views != null ? `${fmt.format(v.views)} views` : ""}
                          {v.data ? ` · ${new Date(v.data).toLocaleDateString("pt-BR")}` : ""}
                        </span>
                        {temTranscript && (
                          <span className="chip chip-ok" style={{ fontSize: "0.65rem", padding: "2px 7px" }}>transcrito</span>
                        )}
                      </div>
                      {temTranscript && conteudo?.transcript && (
                        <details style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                          <summary style={{ cursor: "pointer", fontWeight: 700, color: "var(--berry)", userSelect: "none" }}>ver transcrição</summary>
                          <p style={{ marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto", paddingRight: 4 }}>{conteudo.transcript}</p>
                          <a
                            href={`data:text/plain;charset=utf-8,${encodeURIComponent(conteudo.transcript)}`}
                            download={`transcricao-${conteudo.chave}.txt`}
                            style={{ display: "inline-block", marginTop: 6, fontSize: "0.72rem", color: "var(--berry)", fontWeight: 700 }}
                          >
                            baixar .txt
                          </a>
                        </details>
                      )}
                      {podeTranscricao && v.id && (
                        <BotaoBuscarTranscricao concorrenteId={id} chave={v.id} />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <h2>Anúncios ativos {ads.length ? `(${ads.length})` : ""}</h2>
          <div className="painel">
            {ads.length ? (
              <ul className="mini-lista">
                {ads.map((a, i) => (
                  <li key={i}>{a.texto || "(sem texto)"} <span className="muted" style={{ fontSize: "inherit" }}>{a.ativoDesde ? `desde ${a.ativoDesde}` : ""}{a.pagina ? ` · ${a.pagina}` : ""}</span></li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhum anúncio ativo na última coleta.</p>
            )}
          </div>
        </>
      )}

      {!hist.length && todos.length > 0 && (
        <div className="painel" style={{ marginTop: 24 }}>
          <p className="muted">Nenhum snapshot no período selecionado — tente <Link href={`/concorrente/${c.id}`}>Tudo</Link>.</p>
        </div>
      )}
    </main>
  );
}
