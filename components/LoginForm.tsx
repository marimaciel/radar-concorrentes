"use client";

import { useEffect, useState, type FormEvent } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

const authConfigurado = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    const parametros = new URLSearchParams(window.location.search);
    if (parametros.get("config") === "missing") {
      setAviso("O login ainda não está configurado. Confira as variáveis do Supabase e reinicie o servidor.");
    } else if (parametros.get("acesso") === "negado") {
      setAviso("Este e-mail não está autorizado para acessar o Radar.");
    }
  }, []);

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro("");
    setAviso("");
    setEntrando(true);

    try {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password: senha });
      if (error) {
        setErro("Não foi possível entrar. Confira o e-mail e a senha.");
        return;
      }

      const proximo = new URLSearchParams(window.location.search).get("next");
      const destino = proximo?.startsWith("/") && !proximo.startsWith("//") ? proximo : "/";
      window.location.assign(destino);
    } catch {
      setErro("Não foi possível conectar ao serviço de login. Confira a configuração do Supabase.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <section className="login-panel" aria-labelledby="login-title">
      <p className="login-eyebrow">Radar de Concorrentes</p>
      <h1 id="login-title">Entrar</h1>
      <p className="muted login-description">Acesse sua conta para continuar.</p>

      {aviso && <p className="login-message" role="status">{aviso}</p>}
      {erro && <p className="login-message erro" role="alert">{erro}</p>}

      {!authConfigurado ? (
        <p className="login-message" role="alert">Adicione a chave publishable do Supabase ao `.env.local` e reinicie o servidor.</p>
      ) : (
        <form className="login-form" onSubmit={entrar}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            required
          />
          <button className="btn-berry login-submit" type="submit" disabled={entrando}>
            {entrando ? "Entrando..." : "Entrar no Radar"}
          </button>
        </form>
      )}
    </section>
  );
}