export function Sparkline({ valores, cor }: { valores: number[]; cor: string }) {
  if (valores.length < 2) return null;
  const min = Math.min(...valores), max = Math.max(...valores);
  const norm = (v: number) => (max === min ? 14 : 26 - ((v - min) / (max - min)) * 24);
  const pts = valores.map((v, i) => `${(i / (valores.length - 1)) * 96 + 2},${norm(v)}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 100 28" aria-label="evolução de seguidores">
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
