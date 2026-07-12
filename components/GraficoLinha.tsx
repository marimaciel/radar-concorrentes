type Ponto = { t: number; seg: number | null; eng: number | null };

const W = 800, H = 240, PAD = 16;

function linha(pontos: Ponto[], campo: "seg" | "eng") {
  const validos = pontos.filter((p) => p[campo] != null);
  if (validos.length < 2) return null;
  const vs = validos.map((p) => p[campo] as number);
  const min = Math.min(...vs), max = Math.max(...vs);
  const t0 = pontos[0].t, t1 = pontos[pontos.length - 1].t;
  const x = (t: number) => (t1 === t0 ? W / 2 : PAD + ((t - t0) / (t1 - t0)) * (W - 2 * PAD));
  const y = (v: number) => (max === min ? H / 2 : H - PAD - ((v - min) / (max - min)) * (H - 2 * PAD));
  return validos.map((p) => `${x(p.t).toFixed(1)},${y(p[campo] as number).toFixed(1)}`).join(" ");
}

export function GraficoLinha({ pontos }: { pontos: Ponto[] }) {
  if (pontos.length < 2) {
    return <p className="muted">Ainda não há snapshots suficientes no período para desenhar a evolução — cada coleta adiciona um ponto.</p>;
  }
  const seg = linha(pontos, "seg");
  const eng = linha(pontos, "eng");
  const dataFmt = (t: number) => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="evolução de seguidores e engajamento">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="#e8e1d7" strokeWidth="1" />
        ))}
        {seg && <polyline points={seg} fill="none" stroke="#741e31" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {eng && <polyline points={eng} fill="none" stroke="#d4a574" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        <text x={PAD} y={H - 2} fontSize="11" fill="#8e8080">{dataFmt(pontos[0].t)}</text>
        <text x={W - PAD} y={H - 2} fontSize="11" fill="#8e8080" textAnchor="end">{dataFmt(pontos[pontos.length - 1].t)}</text>
      </svg>
      <div className="legenda">
        <span className="l-seg">Seguidores</span>
        <span className="l-eng">Engajamento médio/post</span>
      </div>
    </div>
  );
}
