"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BotaoBuscarTranscricao({
  concorrenteId,
  chave,
}: {
  concorrenteId: string;
  chave: string;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<"idle" | "buscando" | "ok" | "erro">("idle");
  const [mensagem, setMensagem] = useState<string | null>(null);

  async function buscar() {
    setEstado("buscando");
    setMensagem(null);
    try {
      const res = await fetch("/api/conteudo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concorrente_id: concorrenteId, chave }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEstado("erro");
        setMensagem(json?.erro ?? `Erro ${res.status}`);
        return;
      }
      setEstado("ok");
      setMensagem("Transcrição salva!");
      router.refresh();
    } catch (e: unknown) {
      setEstado("erro");
      setMensagem(e instanceof Error ? e.message : "Falha na requisição");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <button
        onClick={buscar}
        disabled={estado === "buscando" || estado === "ok"}
        className="btn-ghost"
        style={{ fontSize: "0.65rem", padding: "4px 10px", width: "100%" }}
      >
        {estado === "buscando" ? "buscando…" : estado === "ok" ? "ok ✓" : "buscar transcrição"}
      </button>
      {mensagem && (
        <span
          style={{
            fontSize: "0.65rem",
            color: estado === "erro" ? "var(--coral)" : "var(--green)",
          }}
        >
          {mensagem}
        </span>
      )}
    </div>
  );
}
