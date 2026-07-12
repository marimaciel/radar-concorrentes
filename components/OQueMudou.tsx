import type { Snapshot } from "@/lib/supabase";
import { tempoRelativo } from "@/lib/ui";

type Mudanca = { tipo: "novo" | "removido" | "alterado"; texto: string };

export function diffSnapshots(atual: Snapshot, anterior: Snapshot): Mudanca[] {
  const m: Mudanca[] = [];
  const a = atual.dados, b = anterior.dados;

  const bioA = a.perfil?.bio?.trim(), bioB = b.perfil?.bio?.trim();
  if (bioA && bioB && bioA !== bioB) m.push({ tipo: "alterado", texto: `Bio do Instagram mudou: "${bioB.slice(0, 80)}" → "${bioA.slice(0, 80)}"` });

  const siteA = a.site?.titulo?.trim(), siteB = b.site?.titulo?.trim();
  if (siteA && siteB && siteA !== siteB) m.push({ tipo: "alterado", texto: `Título/oferta do site mudou: "${siteB.slice(0, 80)}" → "${siteA.slice(0, 80)}"` });

  const chave = (ad: { texto: string }) => ad.texto.trim().slice(0, 120);
  const adsA = new Set((a.ads ?? []).map(chave));
  const adsB = new Set((b.ads ?? []).map(chave));
  for (const t of adsA) if (!adsB.has(t)) m.push({ tipo: "novo", texto: `Anúncio novo: "${t.slice(0, 90)}"` });
  for (const t of adsB) if (!adsA.has(t)) m.push({ tipo: "removido", texto: `Anúncio saiu do ar: "${t.slice(0, 90)}"` });

  return m;
}

const ROTULO: Record<Mudanca["tipo"], [string, string]> = {
  novo: ["diff-novo", "novo"],
  removido: ["diff-removido", "removido"],
  alterado: ["diff-alterado", "alterado"],
};

export function OQueMudou({ atual, anterior }: { atual: Snapshot | null; anterior: Snapshot | null }) {
  if (!atual || !anterior) return null;
  const mudancas = diffSnapshots(atual, anterior);
  return (
    <>
      <h2>O que mudou</h2>
      <div className="painel">
        <p className="muted" style={{ marginBottom: mudancas.length ? 12 : 0 }}>
          Entre a coleta {tempoRelativo(anterior.coletado_em)} e a coleta {tempoRelativo(atual.coletado_em)}:
        </p>
        {mudancas.length ? (
          <ul className="diff-lista">
            {mudancas.map((m, i) => (
              <li key={i}>
                <span className={`diff-tag ${ROTULO[m.tipo][0]}`}>{ROTULO[m.tipo][1]}</span>
                {m.texto}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nada mudou em bio, site ou anúncios — concorrente estável.</p>
        )}
      </div>
    </>
  );
}
