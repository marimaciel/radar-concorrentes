# Radar de Concorrentes

Dashboard Next.js + Supabase que acompanha concorrentes (Instagram, YouTube, anúncios do Meta) via [AnyAPI](https://getanyapi.com). Cada coleta vira um snapshot no banco; o histórico não se perde. Material da Aula 6 do Clube Divos da IA.

## Stack

Next.js 15 (App Router, TS) · Supabase (Postgres) · deploy na Vercel · coleta 100% server-side via AnyAPI (chave única).

---

## Rodar local (5 min)

```bash
cp .env.local.example .env.local   # preencha as chaves (ver tabela abaixo)
npm install
npm run dev                        # http://localhost:3000
```

Antes do primeiro acesso, configure o login no Supabase, preencha as variáveis abaixo e crie o usuário autorizado. Depois de editar o `.env.local`, **reinicie o `npm run dev`** (o Next lê env só no boot).

### Chaves

| Variável | Onde pegar | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → Project Settings → API → **Project URL** | sim |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | mesma tela → **Publishable key** | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | mesma tela → **service_role** (secret) | sim |
| `RADAR_ALLOWED_EMAIL` | e-mail exato do usuário autorizado em Authentication → Users | sim |
| `ANYAPI_KEY` | getanyapi.com → Dashboard → API Keys → **Create key** | sim |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | não (só `/posicionamento`) |
| `CRON_SECRET` | um segredo qualquer (ex.: `openssl rand -hex 16`) | só no deploy (cron) |

### Banco

Supabase → **SQL Editor** → cole todo o `supabase/schema.sql` → **Run**. Cria as 4 tabelas (`concorrentes`, `snapshots`, `conteudos`, `analises`) com RLS.

No painel Supabase, crie seu usuário em **Authentication → Users → Add user**. O app só autoriza o e-mail definido em `RADAR_ALLOWED_EMAIL`; não compartilhe a chave `SUPABASE_SERVICE_ROLE_KEY`.

### Onde os dados vivem

Tudo fica no **Supabase** (nuvem), não na sua máquina: fechar o `npm run dev` **não perde nada**. Local e produção usam o mesmo banco **se apontarem para o mesmo projeto Supabase**. Use a mesma `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` e na Vercel. Projetos diferentes = dois bancos separados: uma coleta local não aparece em produção (parece que sumiu, mas está no outro banco).

> Após um deploy novo o dashboard fica vazio até a primeira coleta. Dispare em `/setup` ("Coletar agora") ou espere o cron de segunda.

---

## Deploy na Vercel (passo a passo)

> ⚠️ **O erro nº 1:** `.env.local` é gitignored e **não sobe pro deploy**. A Vercel não herda suas chaves locais; você precisa cadastrá-las no painel dela. Sem isso, a home renderiza, chama o Supabase, não acha as chaves e cai em **"server-side exception" (500)**. As chamadas do front viram `JSON.parse: unexpected end of data`. É sempre env faltando.

1. **Suba o código pro GitHub** (o `.gitignore` já protege `.env.local`).
2. Vercel → **Add New Project** → importe o repositório. Framework: Next.js (autodetecta).
3. **Antes de fazer deploy**, vá em **Settings → Environment Variables** e adicione, uma a uma, para o ambiente **Production** (e Preview se quiser):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
  - `RADAR_ALLOWED_EMAIL`
   - `ANYAPI_KEY`
   - `ANTHROPIC_API_KEY` *(opcional)*
   - `CRON_SECRET` *(para a coleta automática)*
4. **Deploy**.
5. Confirme que o `supabase/schema.sql` já foi rodado no projeto Supabase (senão a home também quebra).
6. Abra a URL (`https://<seu-projeto>.vercel.app`). O dashboard deve carregar.

### Mudou uma env depois?

A Vercel **não relê env sem novo deploy**. Após adicionar/editar uma variável: **Deployments → ⋯ → Redeploy**.

### Erro no deploy?

Vercel → o deployment → **Runtime Logs**. O `Digest` que aparece na tela de erro casa com a linha real do log.

---

## Coleta automática (Vercel Cron, passo a passo)

Um **Cron Job da Vercel** faz a coleta semanal: no horário agendado ele chama a rota `GET /api/cron/coletar`, que percorre todos os concorrentes e grava um snapshot de cada. Roda na nuvem, sem depender do seu computador ligado.

### 1. O agendamento já está no código

O arquivo [`vercel.json`](./vercel.json) na raiz define quando roda:

```json
{
  "crons": [
    { "path": "/api/cron/coletar", "schedule": "0 11 * * 1" }
  ]
}
```

`"0 11 * * 1"` é um **cron expression** (minuto, hora, dia-do-mês, mês, dia-da-semana). Aqui: minuto 0, **hora 11 UTC**, toda **segunda-feira** (`1`). O Brasil é UTC−3, então 11:00 UTC = **08:00 BRT**. A Vercel só aceita horário em **UTC**: some 3 do horário de Brasília que você quer. Pra mudar dia ou horário, edite essa linha e faça deploy. Monte a expressão em [crontab.guru](https://crontab.guru).

> **Plano Hobby (grátis):** os crons rodam no máximo **1× por dia** e o horário exato pode variar em alguns minutos. Semanal (como aqui) funciona sem problema. Se quiser de hora em hora, precisa do plano Pro.

### 2. Configure o `CRON_SECRET`

A rota é protegida: só executa se receber `Authorization: Bearer <CRON_SECRET>`. Isso impede que alguém de fora dispare (e gaste) suas coletas.

1. Gere um segredo qualquer: no terminal `openssl rand -hex 16`, ou invente uma string longa.
2. Vercel → **Settings → Environment Variables** → adicione `CRON_SECRET` (ambiente **Production**).
3. **Redeploy** (a Vercel não relê env sem novo deploy).

A própria Vercel injeta esse header ao disparar o cron. Você só precisa ter a env cadastrada, sem configurar header nenhum.

### 3. Confira e teste

- Depois do deploy, o job aparece em **Vercel → seu projeto → aba Cron Jobs**, com o próximo horário e o histórico de execuções.
- **Testar sem esperar segunda-feira:** clique em **Run** na aba Cron Jobs, **ou** dispare manualmente pelo terminal:

  ```bash
  curl -H "Authorization: Bearer SEU_CRON_SECRET" \
    https://SEU-PROJETO.vercel.app/api/cron/coletar
  ```

  Resposta esperada: `{"ok":true,"resultados":{...}}`. Se vier `401`, o `CRON_SECRET` do comando não bate com o do painel. Se vier `500 CRON_SECRET não configurado`, faltou a env (ou o redeploy).

---

## Instalar e usar as skills

O projeto traz **7 skills** em [`.agents/skills/`](./.agents/skills): pequenos manuais que ensinam o Claude a operar o radar e a trabalhar seu conteúdo (setup, coleta, análise, coaching). Ao clonar o projeto, elas vêm junto.

### Jeito mais simples: abrir o projeto no Claude Code

Abra **esta pasta** no [Claude Code](https://claude.com/claude-code) e peça:

> *"use a skill radar-setup"* para ser guiada no primeiro setup
> *"use a skill radar-coleta"* para operar a coleta com segurança
> *"use a skill radar-analise"* para ler o radar e montar roteiro da semana

O Claude lê o `SKILL.md` correspondente e segue aquele passo a passo. Não precisa instalar nada: dentro da pasta do projeto, as skills já funcionam.

### Skills disponíveis

| Skill | Pra quê |
|---|---|
| `radar-setup` | Primeiro setup: as 3 chaves, rodar o `schema.sql`, testar no wizard |
| `radar-coleta` | Operar coleta com segurança: custo real, quando disparar, ler os erros |
| `radar-analise` | Ler o radar: outliers em `/ideias`, tendências, "o que mudou", roteiro |
| `content-coach` | Coaching do seu próprio conteúdo: entrevista e diagnostica vícios |
| `arquivo-para-conteudo` | Transforma seu arquivo antigo no próximo trimestre de conteúdo |
| `clarity-gate` | Gate de clareza: reescreve acima da 5ª série antes de publicar |
| `algoritmo-do-nicho` | Deep research do algoritmo no seu nicho (rodar por trimestre) |

### Usar as skills em qualquer projeto (opcional)

Se quiser as skills disponíveis **fora** desta pasta (em qualquer projeto seu no Claude Code), copie as que quiser para o seu diretório pessoal de skills:

```bash
# macOS / Linux
cp -r .agents/skills/radar-analise ~/.claude/skills/

# Windows (PowerShell)
Copy-Item -Recurse .agents\skills\radar-analise "$HOME\.claude\skills\"
```

Reinicie o Claude Code e a skill passa a ser reconhecida globalmente.

---

## Segurança

- Chave nunca vai ao browser: `/api/estado` retorna só booleanos de presença.
- Sem autenticação na v1 (demo de aula): a URL da Vercel é **pública**. Pra fechar: Vercel → Settings → **Deployment Protection**.

## Problemas comuns

| Sintoma | Causa |
|---|---|
| `server-side exception` / `JSON.parse: unexpected end of data` no Vercel | env não cadastrada no painel da Vercel (ou schema não rodado) |
| Wizard: `URL não encontrada` / `Chave OK mas tabela não encontrada` | `schema.sql` não rodado no Supabase |
| Wizard: `Chave AnyAPI inválida` (401) | chave errada/expirada; gere nova em getanyapi.com |
| `supabase ✘` local | `.env.local` sem chave ou faltou reiniciar `npm run dev` |
| `ads: pulado` na coleta | concorrente sem página no Facebook / `ads_query` vazio |
| Dashboard vazio | nenhuma coleta ainda; dispare em `/setup` |

Setup completo e didático: [`SETUP.md`](./SETUP.md).
