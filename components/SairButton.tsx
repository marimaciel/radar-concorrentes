"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export function SairButton() {
  const [erro, setErro] = useState("");

  async function sair() {
    setErro("");
    const { error } = await supabaseBrowser().auth.signOut();
    if (error) {
      setErro("Não foi possível encerrar a sessão.");
      return;
    }
    window.location.assign("/login");
  }

  return (
    <>
      <button className="btn-ghost" type="button" onClick={sair} title="Sair da conta">
        Sair
      </button>
      {erro && <span className="erro" role="alert">{erro}</span>}
    </>
  );
}