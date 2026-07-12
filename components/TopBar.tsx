"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ColetarAgora } from "./ColetarAgora";

const TABS: [string, string][] = [
  ["/", "Dashboard"],
  ["/tendencias", "Tendências"],
  ["/anuncios", "Anúncios"],
];

export function TopBar() {
  const path = usePathname();
  return (
    <header className="topbar">
      <Link className="logo" href="/">📡 Radar de Concorrentes</Link>
      <nav className="topbar-tabs">
        {TABS.map(([href, rotulo]) => (
          <Link key={href} href={href} className={path === href ? "ativo" : ""}>{rotulo}</Link>
        ))}
      </nav>
      <div className="topbar-acoes">
        <Link href="/setup" className="btn-ghost">⚙️ Configurações</Link>
        <ColetarAgora />
      </div>
    </header>
  );
}
