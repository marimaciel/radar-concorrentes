import Link from "next/link";
import type { Concorrente, Snapshot, Post } from "@/lib/supabase";
import { fmt, tempoRelativo } from "@/lib/ui";
import { Sparkline } from "./Sparkline";
import { Barra } from "./Barra";
import { Chips } from "./Chips";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

function thumbUrl(post: Post): string | null {
  // Prioridade: thumb_path do Storage > thumb CDN do snapshot
  // thumb_path não vem no Post (está em conteudos), então aqui só usamos post.thumb
  if (post.thumb) return post.thumb;
  return null;
}

function MiniThumb({ post }: { post: Post }) {
  const src = thumbUrl(post);
  if (!src) {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 40,
          height: 40,
          borderRadius: 6,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={40}
      height={40}
      loading="lazy"
      style={{
        width: 40,
        height: 40,
        borderRadius: 6,
        objectFit: "cover",
        flexShrink: 0,
        border: "1px solid var(--border)",
      }}
    />
  );
}

function Delta({ atual, anterior, sufixo = "" }: { atual: number | null; anterior: number | null; sufixo?: string }) {
  if (atual == null || anterior == null || anterior === 0) return null;
  const pct = ((atual - anterior) / anterior) * 100;
  if (Math.abs(pct) < 0.05) return <span className="muted"> estável</span>;
  return (
    <span className={pct > 0 ? "delta-up" : "delta-down"}>
      {" "}{pct > 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%{sufixo}
    </span>
  );
}

export function CardConcorrente({ c, atual, anterior, hist, cor }: {
  c: Concorrente;
  atual: Snapshot | null;
  anterior: Snapshot | null;
  hist: Snapshot[];
  cor: string;
}) {
  const d = atual?.dados;
  const posts = d?.posts ?? [];
  const topPosts = [...posts].sort((a, b) => b.likes - a.likes).slice(0, 3);
  const topVideo = [...(d?.videos ?? [])].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  const taxaEng = atual?.seguidores && atual?.eng_medio ? (atual.eng_medio / atual.seguidores) * 100 : null;
  const comentMedio = posts.length ? Math.round(posts.reduce((a, p) => a + p.comentarios, 0) / posts.length) : null;
  const porFormato = posts.reduce<Record<string, { soma: number; n: number }>>((acc, p) => {
    (acc[p.tipo] ||= { soma: 0, n: 0 });
    acc[p.tipo].soma += p.likes + p.comentarios;
    acc[p.tipo].n++;
    return acc;
  }, {});
  const formatos = Object.entries(porFormato).map(([f, v]) => ({ f, media: Math.round(v.soma / v.n), n: v.n }));
  const maxFmt = Math.max(...formatos.map((x) => x.media), 1);
  const seguidoresHist = [...hist].reverse().map((s) => s.seguidores).filter((v): v is number => v != null);

  return (
    <div className="card" style={{ borderTopColor: cor }}>
      <div className="card-top">
        <div className="avatar" aria-hidden>{c.nome.trim().charAt(0).toUpperCase()}</div>
        <div className="quem">
          <h3><Link href={`/concorrente/${c.id}`}>{c.nome}</Link></h3>
          <div className="muted">
            {c.instagram ? <a href={`https://www.instagram.com/${c.instagram}/`} target="_blank">@{c.instagram}</a> : "—"}
            {" · "}{hist.length} coleta(s){atual ? ` · ${tempoRelativo(atual.coletado_em)}` : ""}
          </div>
        </div>
        <Sparkline valores={seguidoresHist} cor={cor} />
      </div>

      {!atual && <p className="muted" style={{ marginTop: 12 }}>Sem coleta ainda — dispare no botão <b>Coletar agora</b> ou em <Link href="/setup">Configurações</Link>.</p>}
      {atual && (
        <>
          <div className="stats">
            <div><b>{fmt.format(atual.seguidores || 0)}</b><span>seguidores<Delta atual={atual.seguidores} anterior={anterior?.seguidores ?? null} /></span></div>
            <div><b>{fmt.format(atual.eng_medio || 0)}</b><span>engaj./post<Delta atual={atual.eng_medio} anterior={anterior?.eng_medio ?? null} /></span></div>
            <div><b>{taxaEng != null ? taxaEng.toFixed(2) + "%" : "—"}</b><span>taxa de engaj.</span></div>
            <div><b>{comentMedio != null ? fmt.format(comentMedio) : "—"}</b><span>coment./post</span></div>
          </div>

          <Chips c={c} snap={atual} />

          {formatos.length > 1 && (
            <>
              <h4>Engajamento por formato <span className="muted">({posts.length} posts)</span></h4>
              {formatos.map(({ f, media, n }) => (
                <Barra key={f} rotulo={`${f} (${n})`} valor={media} max={maxFmt} cor={cor} />
              ))}
            </>
          )}

          {d?.perfil?.bio && <p className="bio">{d.perfil.bio}</p>}

          {topPosts.length > 0 && (
            <>
              <h4>Top posts (likes)</h4>
              <ul className="mini-lista">
                {topPosts.map((p) => (
                  <li key={p.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <MiniThumb post={p} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={p.url ?? "#"} target="_blank" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {(p.legenda || "(sem legenda)").slice(0, 80)}…
                      </a>
                      <span className="muted" style={{ fontSize: "inherit" }}>{fmt.format(p.likes)} ♥ · {fmt.format(p.comentarios)} 💬 · {p.tipo}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {topVideo && (
            <>
              <h4>Vídeo em alta no YouTube</h4>
              <p style={{ fontSize: "0.85rem" }}>
                <a href={topVideo.url ?? "#"} target="_blank">{topVideo.titulo}</a>{" "}
                <span className="muted">{topVideo.views != null ? `${fmt.format(topVideo.views)} views` : ""}{topVideo.data ? ` · ${new Date(topVideo.data).toLocaleDateString("pt-BR")}` : ""}</span>
              </p>
            </>
          )}

          {d?.site?.titulo && (
            <>
              <h4>Site</h4>
              <p style={{ fontSize: "0.85rem" }}><a href={d.site.url} target="_blank">{d.site.titulo}</a></p>
            </>
          )}

          {(d?.ads?.length ?? 0) > 0 ? (
            <>
              <h4>Anúncios ativos ({d!.ads!.length})</h4>
              <ul className="mini-lista">
                {d!.ads!.slice(0, 3).map((a, j) => (
                  <li key={j}>{(a.texto || "(sem texto)").slice(0, 100)} <span className="muted" style={{ fontSize: "inherit" }}>{a.ativoDesde ? `desde ${a.ativoDesde}` : ""}</span></li>
                ))}
              </ul>
            </>
          ) : d?.ads ? (
            <p className="muted" style={{ marginTop: 10 }}>Nenhum anúncio ativo na Meta Ads Library.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
