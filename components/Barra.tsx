import { fmt } from "@/lib/ui";

export function Barra({ rotulo, valor, max, cor, texto }: { rotulo: string; valor: number; max: number; cor: string; texto?: string }) {
  return (
    <div className="bar-row">
      <span>{rotulo}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${Math.max(2, Math.round((valor / max) * 100))}%`, background: cor }} />
      </div>
      <span className="bar-val">{texto ?? fmt.format(valor)}</span>
    </div>
  );
}
