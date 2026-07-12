"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function GerarAnalise() {
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  async function gerar() {
    setRodando(true);
    setErro(null);
    try {
      const r = await fetch("/api/posicionamento", { method: "POST" });
      const json = await r.json();
      if (!json.ok) {
        setErro(json.erro ?? "Erro desconhecido ao gerar análise.");
      } else {
        router.refresh();
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha na conexão.");
    } finally {
      setRodando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {erro && (
        <p style={{ color: "var(--berry)", fontSize: "0.8rem", maxWidth: 480 }}>
          ⚠️ {erro}
        </p>
      )}
      <button
        className="btn-berry"
        onClick={gerar}
        disabled={rodando}
        style={{ alignSelf: "flex-start" }}
      >
        {rodando ? "analisando concorrentes… ~1 min" : "✨ Gerar nova análise"}
      </button>
      {rodando && (
        <p className="muted" style={{ fontSize: "0.75rem" }}>
          Enviando dados dos concorrentes para a IA — isso leva cerca de 1 minuto.
        </p>
      )}
    </div>
  );
}
