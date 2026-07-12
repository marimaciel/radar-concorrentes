import Link from "next/link";
import { supabaseServer, type Concorrente, type Snapshot, type Post } from "@/lib/supabase";
import { fmt } from "@/lib/ui";

export const dynamic = "force-dynamic";

// Últimos 2 snapshots de cada concorrente (ordenados do mais novo para o mais antigo)
function doisUltimos(snapshots: Snapshot[], concId: string): [Snapshot | null, Snapshot | null] {
  const hist = snapshots
    .filter((sn) => sn.concorrente_id === concId)
    .sort((a, b) => Date.parse(b.coletado_em) - Date.parse(a.coletado_em));
  return [hist[0] ?? null, hist[1] ?? null];
}

// Formato campeão: tipo de post com maior média de (likes + comentarios)
function formatoCampeao(posts: Post[] | undefined): { tipo: string; media: number } | null {
  if (!posts?.length) return null;
  const grupos: Record<string, { soma: number; n: number }> = {};
  for (const p of posts) {
    const t = p.tipo ?? "post";
    if (!grupos[t]) grupos[t] = { soma: 0, n: 0 };
    grupos[t].soma += p.likes + p.comentarios;
    grupos[t].n++;
  }
  let melhor: { tipo: string; media: number } | null = null;
  for (const [tipo, { soma, n }] of Object.entries(grupos)) {
    const media = Math.round(soma / n);
    if (!melhor || media > melhor.media) melhor = { tipo, media };
  }
  return melhor;
}

// Posts com data ISO nos últimos 30 dias
function postsRecentes(posts: Post[] | undefined): number | null {
  if (!posts?.length) return null;
  const comData = posts.filter((p) => !!p.data);
  if (!comData.length) return null;
  const corte = Date.now() - 30 * 86400000;
  return comData.filter((p) => Date.parse(p.data!) >= corte).length;
}

const LABEL_TIPO: Record<string, string> = {
  foto: "Foto",
  video: "Vídeo",
  carrossel: "Carrossel",
  post: "Post",
};

export default async function Metricas() {
  const sb = supabaseServer();
  const [{ data: c }, { data: s }] = await Promise.all([
    sb.from("concorrentes").select("*").order("criado_em"),
    sb.from("snapshots").select("*").order("coletado_em", { ascending: false }).limit(300),
  ]);
  const concorrentes = (c as Concorrente[]) ?? [];
  const snapshots = (s as Snapshot[]) ?? [];

  const linhas = concorrentes.map((conc) => {
    const [atual, anterior] = doisUltimos(snapshots, conc.id);
    const seguidores = atual?.seguidores ?? null;
    const deltaSemana =
      atual && anterior && atual.seguidores != null && anterior.seguidores != null
        ? atual.seguidores - anterior.seguidores
        : null;
    const engPorSeguidor =
      atual?.eng_medio != null && seguidores != null && seguidores > 0
        ? (atual.eng_medio / seguidores) * 100
        : null;
    const campeao = formatoCampeao(atual?.dados.posts);
    const posts30d = postsRecentes(atual?.dados.posts);
    const adsAtivos = atual?.dados.ads?.length ?? 0;

    return { conc, seguidores, deltaSemana, engPorSeguidor, campeao, posts30d, adsAtivos };
  });

  const comDados = linhas.filter((l) => l.seguidores != null);

  // Destaques
  const maisEngaja = comDados.reduce<(typeof linhas)[0] | null>((best, l) => {
    if (l.engPorSeguidor == null) return best;
    if (!best || (best.engPorSeguidor ?? -1) < l.engPorSeguidor) return l;
    return best;
  }, null);

  const maisPublica = [...linhas]
    .filter((l) => l.posts30d != null)
    .sort((a, b) => (b.posts30d ?? 0) - (a.posts30d ?? 0))[0] ?? null;

  const maisAnuncia = [...linhas]
    .sort((a, b) => b.adsAtivos - a.adsAtivos)
    .filter((l) => l.adsAtivos > 0)[0] ?? null;

  const semDados = comDados.length < 2;

  return (
    <main>
      <h1>📊 Métricas</h1>
      <p className="muted">
        Tabela comparativa entre todos os concorrentes — seguidores, crescimento semanal, taxa de
        engajamento, formato mais forte, frequência de publicação e anúncios ativos.
      </p>

      {!concorrentes.length && (
        <div className="painel" style={{ marginTop: 24 }}>
          <p className="muted">Nenhum concorrente ainda — adicione em <Link href="/setup">Configurações</Link>.</p>
        </div>
      )}

      {concorrentes.length > 0 && semDados && (
        <div className="painel" style={{ marginTop: 24 }}>
          {comDados.length === 1 ? (
            <p className="muted">As métricas comparam concorrentes entre si — por enquanto só há 1 com dados coletados. Adicione pelo menos mais um em <Link href="/setup">Configurações</Link> e colete para ver a comparação.</p>
          ) : (
            <p className="muted">Ainda não há coletas. Faça pelo menos uma coleta em <Link href="/setup">Configurações</Link> para ver os dados.</p>
          )}
        </div>
      )}

      {!semDados && (
        <div className="painel" style={{ marginTop: 24, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600 }}>Concorrente</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>Seguidores</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>Δ/semana</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>Engajamento</th>
                <th style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600 }}>Formato campeão</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>Posts/30d</th>
                <th style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>Ads ativos</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ conc, seguidores, deltaSemana, engPorSeguidor, campeao, posts30d, adsAtivos }) => (
                <tr key={conc.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <Link href={`/concorrente/${conc.id}`} style={{ color: "var(--berry)", fontWeight: 700 }}>
                      {conc.nome}
                    </Link>
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums" }}>
                    {seguidores != null ? fmt.format(seguidores) : "—"}
                  </td>
                  <td
                    style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums" }}
                    className={deltaSemana != null ? (deltaSemana >= 0 ? "delta-up" : "delta-down") : ""}
                  >
                    {deltaSemana != null
                      ? `${deltaSemana >= 0 ? "▲" : "▼"} ${fmt.format(Math.abs(deltaSemana))}`
                      : "—"}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums" }}>
                    {engPorSeguidor != null
                      ? `${engPorSeguidor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                      : "—"}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    {campeao ? (
                      <span>
                        {LABEL_TIPO[campeao.tipo] ?? campeao.tipo}
                        <span className="muted" style={{ marginLeft: 4, fontSize: "0.78rem" }}>
                          ({fmt.format(campeao.media)} eng. médio)
                        </span>
                      </span>
                    ) : "—"}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums" }}>
                    {posts30d != null ? posts30d : "—"}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px 14px", fontVariantNumeric: "tabular-nums" }}>
                    {adsAtivos}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!semDados && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginTop: 24 }}>
          <div className="card">
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>🏆</div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>Maior engajamento por seguidor</div>
            {maisEngaja ? (
              <>
                <Link href={`/concorrente/${maisEngaja.conc.id}`} style={{ color: "var(--berry)", fontWeight: 700 }}>
                  {maisEngaja.conc.nome}
                </Link>
                <p className="muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>
                  {maisEngaja.engPorSeguidor!.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% de taxa — mesmo com menos seguidores, esse perfil mobiliza mais a audiência.
                </p>
              </>
            ) : <p className="muted" style={{ fontSize: "0.78rem" }}>Dados insuficientes.</p>}
          </div>

          <div className="card">
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>📅</div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>Quem mais publica</div>
            {maisPublica ? (
              <>
                <Link href={`/concorrente/${maisPublica.conc.id}`} style={{ color: "var(--berry)", fontWeight: 700 }}>
                  {maisPublica.conc.nome}
                </Link>
                <p className="muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>
                  {maisPublica.posts30d} post(s) nos últimos 30 dias — consistência de publicação como vantagem competitiva.
                </p>
              </>
            ) : <p className="muted" style={{ fontSize: "0.78rem" }}>Nenhum post com data disponível.</p>}
          </div>

          <div className="card">
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>📢</div>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>Quem mais anuncia</div>
            {maisAnuncia ? (
              <>
                <Link href={`/concorrente/${maisAnuncia.conc.id}`} style={{ color: "var(--berry)", fontWeight: 700 }}>
                  {maisAnuncia.conc.nome}
                </Link>
                <p className="muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>
                  {maisAnuncia.adsAtivos} anúncio(s) ativo(s) — está investindo em tráfego pago agora.{" "}
                  <Link href="/anuncios" style={{ color: "var(--berry)" }}>Ver criativos</Link>.
                </p>
              </>
            ) : <p className="muted" style={{ fontSize: "0.78rem" }}>Nenhum concorrente com anúncios ativos detectados.</p>}
          </div>
        </div>
      )}
    </main>
  );
}
