import Link from "next/link";
import { supabaseServer, type Concorrente, type Snapshot } from "@/lib/supabase";
import { fmt, tempoRelativo } from "@/lib/ui";
import { buscarAnaliseHooks } from "@/lib/analise";
import { IdeiasLista, type CandidatoIdeia } from "@/components/IdeiasLista";

export const dynamic = "force-dynamic";

// Barras de outlier por plataforma — normalizam pra um "destaque" comparável
const BARRA_YT = 5;      // views / inscritos
const BARRA_IG = 0.08;   // (likes + comentários) / seguidores — ~8% já é excelente no Instagram

type Fonte = "youtube" | "instagram";

type Candidato = {
  fonte: Fonte;
  chave: string | null;
  titulo: string;
  url: string | null;
  concorrente: Concorrente;
  data: string | null;
  coletado_em: string;
  audiencia: number;
  metricaPrincipal: number; // views (YT) ou engajamento likes+comentários (IG)
  viewsExtra?: number | null; // views do post IG, quando disponível
  ratio: number;
  destaque: number;
  outlier: boolean;
  transcript: string | null;
};

async function buscarTranscript(
  sb: ReturnType<typeof supabaseServer>,
  fonte: Fonte,
  chave: string
): Promise<string | null> {
  try {
    const { data } = await sb
      .from("conteudos")
      .select("transcript")
      .eq("fonte", fonte)
      .eq("chave", chave)
      .maybeSingle();
    return (data as { transcript?: string | null } | null)?.transcript ?? null;
  } catch {
    return null;
  }
}

function formatarDestaque(c: Candidato): string {
  if (c.fonte === "youtube") {
    return c.ratio >= 10 ? `${Math.round(c.ratio)}×` : `${c.ratio.toFixed(1)}×`;
  }
  const pct = c.ratio * 100;
  return pct >= 10 ? `${Math.round(pct)}%` : `${pct.toFixed(1)}%`;
}

function formatarMetricaLinha(c: Candidato): string {
  const partes: string[] = [];
  if (c.fonte === "youtube") {
    partes.push(`👁 ${fmt.format(c.metricaPrincipal)} views`);
    partes.push(`👥 ${fmt.format(c.audiencia)} inscritos`);
  } else {
    partes.push(`❤️ ${fmt.format(c.metricaPrincipal)} engajamento`);
    partes.push(`👥 ${fmt.format(c.audiencia)} seguidores`);
    if (c.viewsExtra != null && c.viewsExtra > 0) {
      partes.push(`👁 ${fmt.format(c.viewsExtra)} views`);
    }
  }
  partes.push(`📅 coletado ${tempoRelativo(c.coletado_em)}`);
  return partes.join(" · ");
}

export default async function Ideias() {
  const sb = supabaseServer();

  const [{ data: c }, { data: s }] = await Promise.all([
    sb.from("concorrentes").select("*").order("criado_em"),
    sb
      .from("snapshots")
      .select("*")
      .order("coletado_em", { ascending: false }),
  ]);

  const concorrentes = (c as Concorrente[]) ?? [];
  const snapshots = (s as Snapshot[]) ?? [];

  // Último snapshot por concorrente
  const ultimoPorConcorrente = new Map<string, Snapshot>();
  for (const snap of snapshots) {
    if (!ultimoPorConcorrente.has(snap.concorrente_id)) {
      ultimoPorConcorrente.set(snap.concorrente_id, snap);
    }
  }

  // Coleta candidatos de AMBAS plataformas, do último snapshot de cada concorrente
  const candidatosSemTranscript: Omit<Candidato, "transcript">[] = [];

  for (const conc of concorrentes) {
    const snap = ultimoPorConcorrente.get(conc.id);
    if (!snap) continue;

    // YouTube
    const inscritos = snap.dados?.canal?.inscritos;
    if (inscritos && inscritos > 0 && snap.dados?.videos?.length) {
      for (const video of snap.dados.videos) {
        if (video.views == null || video.views <= 0) continue;
        const ratio = video.views / inscritos;
        const destaque = ratio / BARRA_YT;
        candidatosSemTranscript.push({
          fonte: "youtube",
          chave: video.id ?? null,
          titulo: video.titulo || "Sem título",
          url: video.url,
          concorrente: conc,
          data: video.data,
          coletado_em: snap.coletado_em,
          audiencia: inscritos,
          metricaPrincipal: video.views,
          ratio,
          destaque,
          outlier: destaque >= 1,
        });
      }
    }

    // Instagram
    const seguidores = snap.dados?.perfil?.seguidores;
    if (seguidores && seguidores > 0 && snap.dados?.posts?.length) {
      for (const post of snap.dados.posts) {
        const engajamento = (post.likes || 0) + (post.comentarios || 0);
        const ratio = engajamento / seguidores;
        const destaque = ratio / BARRA_IG;
        const primeiraLinha = post.legenda?.split("\n")[0]?.trim();
        candidatosSemTranscript.push({
          fonte: "instagram",
          chave: post.code ?? null,
          titulo: primeiraLinha || "Post",
          url: post.url,
          concorrente: conc,
          data: post.data ?? null,
          coletado_em: snap.coletado_em,
          audiencia: seguidores,
          metricaPrincipal: engajamento,
          viewsExtra: post.views,
          ratio,
          destaque,
          outlier: destaque >= 1,
        });
      }
    }
  }

  // Rankeia por destaque desc (normaliza as duas plataformas na mesma escala) e pega o top 24
  candidatosSemTranscript.sort((a, b) => b.destaque - a.destaque);
  const top = candidatosSemTranscript.slice(0, 24);

  // Busca transcrições em paralelo
  const candidatos: Candidato[] = await Promise.all(
    top.map(async (cand) => ({
      ...cand,
      transcript: cand.chave ? await buscarTranscript(sb, cand.fonte, cand.chave) : null,
    }))
  );

  const hooksPorChave = await buscarAnaliseHooks();

  const candidatosProp: CandidatoIdeia[] = candidatos.map((cand, i) => {
    const chave = cand.chave ?? `sem-chave-${cand.fonte}-${i}`;
    const hook = cand.chave ? hooksPorChave.get(cand.chave) ?? null : null;
    return {
      chave,
      fonte: cand.fonte,
      titulo: cand.titulo,
      url: cand.url,
      concorrenteId: cand.concorrente.id,
      concorrenteNome: cand.concorrente.nome,
      dataRel: cand.data ? tempoRelativo(cand.data) : null,
      destaque: cand.destaque,
      outlier: cand.outlier,
      ratioLabel: formatarDestaque(cand),
      metricaLinha: formatarMetricaLinha(cand),
      transcript: cand.transcript,
      temTranscript: !!cand.transcript && !!cand.chave,
      jaAnalisado: !!hook,
      hook,
    };
  });

  const concorrentesProp = concorrentes.map((conc) => ({ id: conc.id, nome: conc.nome }));

  return (
    <main>
      <h1>💡 Ideias Outlier</h1>
      <p className="muted">
        O melhor da última janela de coleta, sempre — Instagram e YouTube juntos. Um item vira
        <strong> outlier</strong> quando cruza a barra da própria plataforma: {BARRA_YT}× mais views que
        inscritos no YouTube, ou engajamento acima de ~{Math.round(BARRA_IG * 100)}% dos seguidores no
        Instagram. Abaixo da barra ainda aparece — é o melhor disponível, só não bateu o recorde.
      </p>

      {candidatosProp.length === 0 ? (
        <div className="painel" style={{ marginTop: 24, padding: 24 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>Nenhum conteúdo disponível ainda.</p>
          <p className="muted" style={{ marginBottom: 8 }}>
            Esta página varre o último snapshot de cada concorrente cadastrado, em busca de posts do
            Instagram e vídeos do YouTube. Para aparecer, o snapshot precisa ter dado de audiência
            (seguidores ou inscritos) e pelo menos um post ou vídeo coletado.
          </p>
          <p className="muted" style={{ marginBottom: 8 }}>
            Se ainda não apareceu nada, pode ser que:
          </p>
          <ul className="muted" style={{ paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Ainda não há concorrentes cadastrados, ou nenhum tem snapshot coletado.</li>
            <li>Os snapshots foram coletados antes da captura de seguidores/inscritos ser implementada — nesses casos não há como calcular o ratio.</li>
            <li>Os canais/perfis cadastrados ainda não têm posts ou vídeos na última coleta.</li>
          </ul>
          <p className="muted" style={{ marginTop: 8 }}>
            Adicione mais concorrentes em{" "}
            <Link href="/setup" style={{ color: "var(--berry)" }}>Configurações</Link>{" "}
            e aguarde a próxima coleta semanal.
          </p>
        </div>
      ) : (
        <IdeiasLista candidatos={candidatosProp} concorrentes={concorrentesProp} />
      )}

      <p className="muted" style={{ marginTop: 16, fontSize: "0.85rem" }}>
        YouTube: ratio = views ÷ inscritos do canal. Instagram: ratio = (likes + comentários) ÷ seguidores.
        Destaque normaliza os dois pela barra de cada plataforma para poder ranquear juntos. Snapshots sem
        dado de audiência não entram no cálculo.
      </p>
    </main>
  );
}
