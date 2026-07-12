# Radar de Concorrentes

Dashboard Next.js + Supabase que acompanha concorrentes (Instagram, YouTube, anúncios do Meta) via [AnyAPI](https://getanyapi.com). Cada coleta vira um snapshot no banco — o histórico não se perde. Material da Aula 6 do Clube Divos da IA.

## Stack

Next.js 15 (App Router, TS) · Supabase (Postgres) · deploy na Vercel · coleta 100% server-side via AnyAPI (chave única).

---

## Rodar local (5 min)

```bash
cp .env.local.example .env.local   # preencha as chaves (ver tabela abaixo)
npm install
npm run dev                        # http://localhost:3000
```

Sem chaves, o app abre o **wizard** (`/setup/wizard`) que testa cada chave e gera o `.env.local` pra você. Depois de editar o `.env.local`, **reinicie o `npm run dev`** — o Next lê env só no boot.

### Chaves

| Variável | Onde pegar | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | supabase.com → Project Settings → API → **Project URL** | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | mesma tela → **service_role** (secret) | sim |
| `ANYAPI_KEY` | getanyapi.com → Dashboard → API Keys → **Create key** | sim |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | não (só `/posicionamento`) |
| `CRON_SECRET` | um segredo qualquer (ex.: `openssl rand -hex 16`) | só no deploy (cron) |

### Banco

Supabase → **SQL Editor** → cole todo o `supabase/schema.sql` → **Run**. Cria as 4 tabelas (`concorrentes`, `snapshots`, `conteudos`, `analises`) com RLS.

### Onde os dados vivem

Tudo fica no **Supabase** (nuvem), não na sua máquina — fechar o `npm run dev` **não perde nada**. Local e produção usam o mesmo banco **se apontarem para o mesmo projeto Supabase**. Use a mesma `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` no `.env.local` e na Vercel. Projetos diferentes = dois bancos separados: uma coleta local não aparece em produção (parece que sumiu, mas está no outro banco).

> Após um deploy novo o dashboard fica vazio até a primeira coleta — dispare em `/setup` ("Coletar agora") ou espere o cron de segunda.

---

## Deploy na Vercel (passo a passo)

> ⚠️ **O erro nº 1:** `.env.local` é gitignored e **não sobe pro deploy**. A Vercel não herda suas chaves locais — você precisa cadastrá-las no painel dela. Sem isso, a home renderiza, chama o Supabase, não acha as chaves e cai em **"server-side exception" (500)**. As chamadas do front viram `JSON.parse: unexpected end of data`. É sempre env faltando.

1. **Suba o código pro GitHub** (o `.gitignore` já protege `.env.local`).
2. Vercel → **Add New Project** → importe o repositório. Framework: Next.js (autodetecta).
3. **Antes de fazer deploy**, vá em **Settings → Environment Variables** e adicione, uma a uma, para o ambiente **Production** (e Preview se quiser):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANYAPI_KEY`
   - `ANTHROPIC_API_KEY` *(opcional)*
   - `CRON_SECRET` *(para a coleta automática)*
4. **Deploy**.
5. Confirme que o `supabase/schema.sql` já foi rodado no projeto Supabase (senão a home também quebra).
6. Abra a URL (`https://<seu-projeto>.vercel.app`) — deve carregar o dashboard.

### Mudou uma env depois?

A Vercel **não relê env sem novo deploy**. Após adicionar/editar uma variável: **Deployments → ⋯ → Redeploy**.

### Erro no deploy?

Vercel → o deployment → **Runtime Logs**. O `Digest` que aparece na tela de erro casa com a linha real do log.

---

## Coleta automática (Vercel Cron)

O `vercel.json` já agenda `GET /api/cron/coletar` toda **segunda 08:00 (BRT)**. Requer `CRON_SECRET` no env da Vercel — ela envia `Authorization: Bearer <CRON_SECRET>` sozinha. Sem o segredo, a rota recusa (ninguém dispara sua coleta por fora). Execuções aparecem na aba **Cron Jobs** do projeto.

---

## Segurança

- Chave nunca vai ao browser: `/api/estado` retorna só booleanos de presença.
- Sem autenticação na v1 (demo de aula) — a URL da Vercel é **pública**. Pra fechar: Vercel → Settings → **Deployment Protection**.

## Problemas comuns

| Sintoma | Causa |
|---|---|
| `server-side exception` / `JSON.parse: unexpected end of data` no Vercel | env não cadastrada no painel da Vercel (ou schema não rodado) |
| Wizard: `URL não encontrada` / `Chave OK mas tabela não encontrada` | `schema.sql` não rodado no Supabase |
| Wizard: `Chave AnyAPI inválida` (401) | chave errada/expirada — gere nova em getanyapi.com |
| `supabase ✘` local | `.env.local` sem chave ou faltou reiniciar `npm run dev` |
| `ads: pulado` na coleta | concorrente sem página no Facebook / `ads_query` vazio |
| Dashboard vazio | nenhuma coleta ainda — dispare em `/setup` |

Setup completo e didático: [`SETUP.md`](./SETUP.md).
