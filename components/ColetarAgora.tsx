"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Concorrente } from "@/lib/supabase";

export function ColetarAgora() {
  const [status, setStatus] = useState<string | null>(null);
  const [rodando, setRodando] = useState(false);
  const router = useRouter();

  async function coletar() {
    setRodando(true);
    setStatus("buscando concorrentes…");
    try {
      const lista: Concorrente[] = await fetch("/api/concorrentes").then((r) => r.json());
      if (!Array.isArray(lista) || !lista.length) {
        setStatus("nenhum concorrente — adicione em Configurações");
        return;
      }
      let falhas = 0;
      for (let i = 0; i < lista.length; i++) {
        setStatus(`coletando ${i + 1}/${lista.length}: ${lista[i].nome}…`);
        try {
          const r = await fetch("/api/coletar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: lista[i].id }),
          }).then((res) => res.json());
          if (!r.ok) falhas++;
        } catch {
          falhas++;
        }
      }
      setStatus(falhas ? `concluído — ${falhas} falha(s), veja os chips` : "coleta concluída ✔");
      router.refresh();
    } catch (e) {
      setStatus(`erro: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRodando(false);
    }
  }

  return (
    <>
      {status && <span className="muted" style={{ fontSize: "0.75rem" }}>{status}</span>}
      <button className="btn-berry" onClick={coletar} disabled={rodando}>
        {rodando ? "Coletando…" : "▶ Coletar agora"}
      </button>
    </>
  );
}
