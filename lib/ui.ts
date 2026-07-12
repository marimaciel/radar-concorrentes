export const fmt = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

export const CORES = ["#e8a89e", "#d4a574", "#741e31", "#7bb583", "#9db4c9"];

export function tempoRelativo(iso: string) {
  const h = Math.round((Date.now() - Date.parse(iso)) / 3600000);
  if (h < 1) return "há menos de 1h";
  if (h < 48) return `há ${h}h`;
  return `há ${Math.round(h / 24)} dias`;
}

export type Periodo = "7" | "30" | "90" | "tudo";

export function filtrarPorPeriodo<T extends { coletado_em: string }>(snaps: T[], p: Periodo): T[] {
  if (p === "tudo") return snaps;
  const corte = Date.now() - Number(p) * 86400000;
  return snaps.filter((s) => Date.parse(s.coletado_em) >= corte);
}

export function normalizarPeriodo(v: string | undefined): Periodo {
  return v === "7" || v === "30" || v === "90" ? v : "tudo";
}
