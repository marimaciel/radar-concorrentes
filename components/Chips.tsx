import type { Concorrente, Snapshot } from "@/lib/supabase";
import { humanizarErro } from "@/lib/coleta";

const FONTES = ["instagram", "youtube", "site", "ads"] as const;
const FONTE_ROTULO: Record<string, string> = { instagram: "Instagram", youtube: "YouTube", site: "Site", ads: "Anúncios" };

export function Chips({ c, snap }: { c: Concorrente; snap: Snapshot }) {
  const d = snap.dados;
  const configurada: Record<string, boolean> = {
    instagram: !!c.instagram, youtube: !!c.youtube, site: !!c.site, ads: !!c.ads_query,
  };
  const coletada: Record<string, boolean> = {
    instagram: !!d.perfil, youtube: !!d.videos, site: !!d.site, ads: !!d.ads,
  };
  return (
    <div className="chips">
      {FONTES.map((f) => {
        if (!configurada[f]) return <span className="chip chip-off" key={f} title="Fonte não configurada — adicione em Configurações">{FONTE_ROTULO[f]} —</span>;
        if (d.avisos?.[f]) return <span className="chip chip-aviso" key={f} title={d.avisos[f]}>{FONTE_ROTULO[f]} ✔ fallback</span>;
        if (coletada[f]) return <span className="chip chip-ok" key={f}>{FONTE_ROTULO[f]} ✔</span>;
        const motivo = snap.erros?.[f] ? humanizarErro(snap.erros[f]) : "sem dados";
        return <span className="chip chip-erro" key={f} title={motivo}>{FONTE_ROTULO[f]} ✘ {motivo.split("—")[0].trim()}</span>;
      })}
    </div>
  );
}
