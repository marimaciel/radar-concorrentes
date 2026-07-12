---
name: radar-setup
description: Use quando a aluna vai configurar o Radar pela primeira vez, não sabe onde pegar uma chave (Supabase, AnyAPI, Anthropic), o wizard mostra chip vermelho, ou aparece "rode o schema.sql".
---

# radar-setup — Primeiro Setup do Radar

Use quando a aluna precisar configurar o Radar pela primeira vez ou quando algo no setup não estiver funcionando.

## As 3 chaves que o app precisa

| Chave | Onde pegar | Obrigatória? |
|-------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → seu projeto → **Project Settings → API → Project URL** | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | mesma tela, campo **service_role** (fica escondido — clique em "Reveal") | Sim |
| `ANYAPI_KEY` | getanyapi.com → **Dashboard → API Keys → Create key** | Sim |
| `ANTHROPIC_API_KEY` | console.anthropic.com → **API Keys** | Não — só para Insights IA |

## Passo a passo

### 1. Criar o banco no Supabase (5 min)
1. Entre em supabase.com → **New project** (nome sugerido: `radar-concorrentes`)
2. Aguarde o projeto ficar pronto (pode levar 1-2 min)
3. No menu lateral → **SQL Editor** → cole todo o conteúdo do arquivo `supabase/schema.sql` → clique **Run**
4. Se aparecer "Success" verde: banco pronto!

### 2. Criar conta no AnyAPI
1. Acesse getanyapi.com → **Sign up**
2. No painel: **Dashboard → API Keys → Create key** → copie a chave

### 3. Configurar o arquivo de variáveis
No computador local: copie `.env.local.example` para `.env.local` e preencha as 3 chaves obrigatórias.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
ANYAPI_KEY=sk-...
```

### 4. Testar via wizard
Acesse `/setup/wizard` no app (ou deixe o app redirecionar se não houver concorrentes ainda).

Cada passo do wizard tem um botão **Testar** — clique antes de avançar:
- Se aparecer chip verde ✓: chave aceita, pode avançar
- Se aparecer chip vermelho ✘: veja a tabela de problemas abaixo

### 5. Publicar na Vercel
No painel da Vercel: **Settings → Environment Variables** → adicione as mesmas chaves do `.env.local`.

---

## Chips de erro — o que significa cada um

| Chip | O que aconteceu | Como resolver |
|------|----------------|---------------|
| `supabase ✘` | URL ou service_role errada, ou tabela não existe | Confira se colou a URL certa (não a anon key!); rode o `schema.sql` no SQL Editor |
| `anyapi ✘` | Chave inválida ou sem crédito na conta | Entre no getanyapi.com e confirme que a chave está ativa e tem saldo |
| `anthropic ✘` | Chave inválida (mas o app funciona sem ela) | Deixe em branco se não for usar Insights IA |
| "rode o schema.sql" | Tabela `concorrentes` ou `snapshots` não encontrada | Volte ao SQL Editor do Supabase e rode o `schema.sql` novamente |

## Dica: reiniciar o servidor
Sempre que alterar o `.env.local`, pare o `npm run dev` com Ctrl+C e rode de novo — o Next.js não detecta mudanças de env automaticamente.
