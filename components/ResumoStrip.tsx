import { tempoRelativo } from "@/lib/ui";

export function ResumoStrip({ concorrentes, coletas, ultima }: { concorrentes: number; coletas: number; ultima: string | null }) {
  const proxima = ultima
    ? new Date(Date.parse(ultima) + 7 * 86400000).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })
    : "—";
  return (
    <div className="resumo">
      <div>
        <span className="rotulo">Concorrentes</span>
        <b>{concorrentes}</b>
      </div>
      <div>
        <span className="rotulo">Histórico de coletas</span>
        <b>{coletas}</b>
      </div>
      <div>
        <span className="rotulo">Última coleta</span>
        {ultima ? <span className="vivo">{tempoRelativo(ultima)}</span> : <b>—</b>}
      </div>
      <div>
        <span className="rotulo">Próxima sugerida</span>
        <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{proxima}</span>
      </div>
    </div>
  );
}
