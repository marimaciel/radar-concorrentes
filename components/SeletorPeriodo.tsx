import Link from "next/link";
import type { Periodo } from "@/lib/ui";

const OPCOES: [Periodo, string][] = [
  ["7", "7 dias"],
  ["30", "30 dias"],
  ["90", "90 dias"],
  ["tudo", "Tudo"],
];

export function SeletorPeriodo({ base, atual }: { base: string; atual: Periodo }) {
  return (
    <div className="periodos" aria-label="filtrar por período">
      {OPCOES.map(([p, rotulo]) => (
        <Link key={p} href={p === "tudo" ? base : `${base}?p=${p}`} className={atual === p ? "ativo" : ""}>
          {rotulo}
        </Link>
      ))}
    </div>
  );
}
