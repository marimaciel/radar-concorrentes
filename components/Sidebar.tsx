"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS: [string, string, string][] = [
  ["/", "🎯", "Visão Geral"],
  ["/concorrentes", "👥", "Competidores"],
  ["/tendencias", "📈", "Tendências"],
  ["/ideias", "💡", "Ideias"],
  ["/posicionamento", "🧭", "Posicionamento"],
  ["/metricas", "📊", "Métricas"],
  ["/anuncios", "📢", "Anúncios"],
];

function ativo(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/concorrentes") return path.startsWith("/concorrente");
  return path.startsWith(href);
}

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
      {ITENS.map(([href, icone, rotulo]) => (
        <Link key={href} href={href} className={ativo(path, href) ? "ativo" : ""}>
          <span aria-hidden>{icone}</span> {rotulo}
        </Link>
      ))}
      <div className="fim">
        <Link href="/setup" className={path.startsWith("/setup") ? "ativo" : ""}>
          <span aria-hidden>⚙️</span> Configurações
        </Link>
      </div>
    </aside>
  );
}
