import Link from "next/link";
import { supabaseServer, type Concorrente, type Snapshot, type Conteudo } from "@/lib/supabase";
import { CORES, tempoRelativo } from "@/lib/ui";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function thumbPublicUrl(thumbPath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/thumbs/${thumbPath}`;
}

export default async function Anuncios() {
  const sb = supabaseServer();
  const [{ data: c }, { data: s }] = await Promise.all([
    sb.from("concorrentes").select("*").order("criado_em"),
    sb.from("snapshots").select("*").order("coletado_em", { ascending: false }).limit(300),
  ]);
  const concorrentes = (c as Concorrente[]) ?? [];
  const snapshots = (s as Snapshot[]) ?? [];

  // Busca conteudos de fonte "ads" para todos os concorrentes (tabela pode não existir)
  let conteudosAds: Conteudo[] = [];
  try {
    const { data: rows } = await sb
      .from("conteudos")
      .select("*")
      .eq("fonte", "ads");
    conteudosAds = (rows as Conteudo[]) ?? [];
  } catch {
    // tabela ainda não criada — segue sem
  }
  const conteudosMap = new Map<string, Conteudo>();
  for (const row of conteudosAds) {
    conteudosMap.set(`${row.concorrente_id}:${row.chave}`, row);
  }

  const grupos = concorrentes.map((conc, i) => {
    const atual = snapshots.find((sn) => sn.concorrente_id === conc.id) ?? null;
    return { conc, atual, ads: atual?.dados.ads ?? [], cor: CORES[i % CORES.length] };
  });
  const totalAtivos = grupos.reduce((a, g) => a + g.ads.length, 0);

  return (
    <main>
      <h1>Anúncios</h1>
      <p className="muted">Todos os criativos ativos na Meta Ads Library, agregados da última coleta de cada concorrente — <b>{totalAtivos}</b> ativo(s) no total.</p>

      {!concorrentes.length && (
        <div className="painel" style={{ marginTop: 24 }}>
          <p className="muted">Nenhum concorrente ainda — adicione em <Link href="/setup">Configurações</Link>.</p>
        </div>
      )}

      <div className="grid" style={{ marginTop: 24 }}>
        {grupos.map(({ conc, atual, ads, cor }) => (
          <div className="card" key={conc.id} style={{ borderTopColor: cor }}>
            <div className="card-top">
              <div className="quem">
                <h3><Link href={`/concorrente/${conc.id}`}>{conc.nome}</Link></h3>
                <div className="muted">
                  {atual ? `coleta ${tempoRelativo(atual.coletado_em)}` : "sem coleta"} · {ads.length} anúncio(s)
                </div>
              </div>
            </div>
            {ads.length ? (
              <ul className="mini-lista" style={{ marginTop: 14, listStyle: "none", padding: 0 }}>
                {ads.map((a, j) => {
                  // Tenta thumb via conteudos (fonte ads, chave = hash/índice — legado)
                  const chaveAd = `ad-${j}`;
                  const conteudo = conteudosMap.get(`${conc.id}:${chaveAd}`);
                  const src = conteudo?.thumb_path ? thumbPublicUrl(conteudo.thumb_path) : null;

                  // Transcript de ad de vídeo: chave = ad.id
                  const conteudoAd = a.id ? conteudosMap.get(`${conc.id}:${a.id}`) : null;
                  const transcricao = conteudoAd?.transcript ?? null;

                  const formatoLabel = (f: string | null | undefined) => {
                    if (!f) return null;
                    const mapa: Record<string, string> = { VIDEO: "Vídeo", IMAGE: "Imagem", DPA: "Dinâmico", DCO: "Dinâmico" };
                    return mapa[f] ?? f;
                  };

                  return (
                    <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 12px", marginBottom: 8 }}>
                      {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt="criativo"
                          loading="lazy"
                          width={120}
                          height={120}
                          style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)", flexShrink: 0 }}
                        />
                      ) : null}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.8rem", lineHeight: 1.5, color: "var(--text)" }}>
                          {(a.texto || "(sem texto)").slice(0, 200)}
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6, alignItems: "center" }}>
                          {a.plataformas?.map((p) => (
                            <span key={p} style={{ fontSize: "0.68rem", background: "var(--border)", borderRadius: 4, padding: "1px 5px", color: "var(--text-muted, var(--muted))" }}>
                              {p === "FACEBOOK" ? "FB" : p === "INSTAGRAM" ? "IG" : p}
                            </span>
                          ))}
                          {formatoLabel(a.formato) && (
                            <span style={{ fontSize: "0.68rem", background: "var(--border)", borderRadius: 4, padding: "1px 5px", color: "var(--text-muted, var(--muted))" }}>
                              {formatoLabel(a.formato)}
                            </span>
                          )}
                          {a.ativoDesde && (
                            <span className="muted" style={{ fontSize: "0.72rem" }}>
                              ativo desde {a.ativoDesde}{a.ativoAte ? ` até ${a.ativoAte}` : ""}
                            </span>
                          )}
                          {a.link && (
                            <a href={a.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.72rem", color: "var(--berry)", textDecoration: "underline", marginLeft: "auto" }}>
                              ver na Meta Ad Library ↗
                            </a>
                          )}
                        </div>
                        {transcricao && (
                          <details style={{ marginTop: 8 }}>
                            <summary style={{ fontSize: "0.72rem", color: "var(--berry)", cursor: "pointer" }}>
                              ver transcrição do vídeo
                            </summary>
                            <p style={{ fontSize: "0.78rem", lineHeight: 1.5, color: "var(--text)", marginTop: 6, whiteSpace: "pre-wrap" }}>
                              {transcricao}
                            </p>
                          </details>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted" style={{ marginTop: 14 }}>
                {atual?.dados.ads ? "Nenhum anúncio ativo." : "Fonte de anúncios sem dados na última coleta."}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
